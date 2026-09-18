"""Import en masse par fichier Excel pour les pages Architecture (catalogue des tâches et
architecture monétaire) : chaque ligne du classeur est validée et enregistrée via le même
serializer qu'une création manuelle (TaskTemplateSerializer / LigneBudgetaireCreateSerializer),
pour ne jamais dupliquer les règles métier. Les lignes sont résolues en plusieurs passes afin
d'accepter un classeur où un parent apparaît après ses enfants."""
import io
import re
import unicodedata
from decimal import Decimal, InvalidOperation

import openpyxl
from openpyxl.styles import Font
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .access import can_access_config
from .models import TASK_PRIORITE_CHOICES, LigneBudgetaire, TaskTemplate, Team
from .serializers import LigneBudgetaireCreateSerializer, LigneBudgetaireSerializer, TaskTemplateSerializer


def _norm(text):
    text = unicodedata.normalize('NFKD', str(text or ''))
    text = ''.join(char for char in text if not unicodedata.combining(char)).lower()
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def _read_rows(fichier):
    """Renvoie (entetes, rows) : `entetes` est l'ensemble normalisé des en-têtes de la première
    ligne (pour que l'appelant détecte quel format de classeur a été fourni), `rows` la liste
    (numero, valeurs) des lignes de données non vides."""
    if not fichier.name.lower().endswith(('.xlsx', '.xlsm')):
        raise ValidationError('Le fichier doit être un classeur Excel (.xlsx).')
    try:
        classeur = openpyxl.load_workbook(fichier, data_only=True, read_only=True)
    except Exception:
        raise ValidationError('Fichier Excel illisible ou corrompu.')
    feuille = classeur.active
    toutes_lignes = list(feuille.iter_rows(values_only=True))
    classeur.close()
    if not toutes_lignes:
        raise ValidationError('Le fichier est vide.')
    entetes = [_norm(cell) for cell in toutes_lignes[0]]
    rows = []
    for numero, row in enumerate(toutes_lignes[1:], start=2):
        if all(cell is None or str(cell).strip() == '' for cell in row):
            continue
        rows.append((numero, {entetes[i]: row[i] for i in range(min(len(entetes), len(row)))}))
    return set(entetes), rows


def _cell(valeurs, *alias):
    for cle in alias:
        if cle in valeurs and valeurs[cle] is not None:
            valeur = valeurs[cle]
            # Un code saisi sous forme numérique dans Excel (ex. colonne « Code » au format
            # Nombre plutôt que Texte) est lu par openpyxl comme un float (1 -> 1.0) : sans ce
            # repli, le code importé ne correspondrait plus jamais à celui saisi ni à un « Code
            # parent » qui le référence, cassant la mise en correspondance des colonnes du fichier.
            if isinstance(valeur, float) and valeur.is_integer():
                valeur = int(valeur)
            texte = str(valeur).strip()
            if texte:
                return texte
    return ''


def _bool_cell(valeurs, default, *alias):
    texte = _cell(valeurs, *alias).lower()
    if not texte:
        return default
    return texte in ('oui', 'o', 'yes', 'y', 'true', '1', 'x')


def _decimal_cell(valeurs, *alias):
    texte = _cell(valeurs, *alias)
    if not texte:
        return None
    try:
        return Decimal(texte.replace(',', '.').replace(' ', ''))
    except InvalidOperation:
        raise ValueError(f'« {texte} » n’est pas un nombre valide.')


def _choice_cell(choices, valeurs, default, *alias):
    texte = _cell(valeurs, *alias)
    if not texte:
        return default
    texte_norm = _norm(texte)
    for key, label in choices:
        if _norm(key) == texte_norm or _norm(label) == texte_norm:
            return key
    valeurs_possibles = ', '.join(label for _key, label in choices)
    raise ValueError(f'« {texte} » n’est pas reconnu (valeurs possibles : {valeurs_possibles}).')


def _resoudre_equipe(organisation, texte):
    """Retrouve l'équipe désignée par la colonne « Equipe » du fichier, par code ou par nom. La
    casse et les accents saisis dans le classeur ne correspondent pas toujours exactement à la
    nomenclature enregistrée (ex. « Direction Generale » vs « Direction Générale ») : après
    l'égalité stricte, on retente par comparaison normalisée (accents/casse/espaces ignorés) pour
    que l'import reste fluide plutôt que de casser toute la sous-arborescence de cette équipe."""
    if not texte:
        return None
    exact = (
        Team.objects.filter(organisation=organisation, code__iexact=texte).first()
        or Team.objects.filter(organisation=organisation, name__iexact=texte).first()
    )
    if exact is not None:
        return exact
    cible = _norm(texte)
    for equipe in Team.objects.filter(organisation=organisation):
        if _norm(equipe.code) == cible or _norm(equipe.name) == cible:
            return equipe
    return None


def _resolution_par_passes(en_attente, resoudre_ligne):
    """Traite `en_attente` (code -> (numero, valeurs)) en plusieurs passes, pour que l'ordre des
    lignes dans le classeur n'ait pas d'importance : une ligne n'est traitée que lorsque son code
    parent a déjà été résolu (préexistant en base ou créé dans une passe précédente).
    `resoudre_ligne(code, numero, valeurs)` doit renvoyer True si la ligne a été traitée
    (créée ou en erreur), False si elle doit attendre une prochaine passe."""
    progresse = True
    while en_attente and progresse:
        progresse = False
        for code in list(en_attente.keys()):
            numero, valeurs = en_attente[code]
            if resoudre_ligne(code, numero, valeurs):
                del en_attente[code]
                progresse = True
    return en_attente


def _task_template_data_commune(valeurs):
    """Champs métier communs aux deux formats de classeur (paramétrage absent du format
    « Niveau » : on applique alors les mêmes défauts que dans le modèle standard)."""
    return {
        'type_element': _choice_cell(TaskTemplate.TYPE_CHOICES, valeurs, 'dossier', 'type', 'type dossier tache elementaire'),
        'attribuable': _bool_cell(valeurs, True, 'attribuable', 'attribuable oui non'),
        'recurrente': _bool_cell(valeurs, False, 'recurrente', 'recurrente oui non'),
        'frequence': _choice_cell(TaskTemplate.FREQUENCE_CHOICES, valeurs, 'ponctuelle', 'frequence', 'frequence ponctuelle recurrente'),
        'mode_declenchement': _choice_cell(TaskTemplate.DECLENCHEMENT_CHOICES, valeurs, 'manuel', 'declenchement', 'mode declenchement', 'declenchement manuel automatique'),
        'priorite_defaut': _choice_cell(TASK_PRIORITE_CHOICES, valeurs, 'moyenne', 'priorite', 'priorite defaut', 'priorite haute moyenne basse'),
        'duree_estimee_heures': _decimal_cell(valeurs, 'duree estimee h', 'duree estimee', 'duree'),
        'details': _cell(valeurs, 'details'),
        'explication': _cell(valeurs, 'explication'),
    }


def _import_task_templates_par_code_parent(rows, organisation, request):
    """Format standard (modèle téléchargeable) : la colonne « Code parent » relie explicitement
    chaque ligne à son parent, dans n'importe quel ordre (voir _resolution_par_passes)."""
    codes_connus = {c.lower() for c in TaskTemplate.objects.filter(organisation=organisation).values_list('code', flat=True)}
    en_attente = {}
    codes_vus = set()
    errors = []
    for numero, valeurs in rows:
        code = _cell(valeurs, 'code')
        if not code:
            errors.append({'ligne': numero, 'code': '', 'erreurs': {'code': 'Le code est obligatoire.'}})
            continue
        if code.lower() in codes_vus:
            errors.append({'ligne': numero, 'code': code, 'erreurs': {'code': 'Ce code apparaît plusieurs fois dans le fichier.'}})
            continue
        codes_vus.add(code.lower())
        en_attente[code] = (numero, valeurs)

    created = []

    def resoudre(code, numero, valeurs):
        code_parent = _cell(valeurs, 'code parent', 'parent')
        if code_parent and code_parent.lower() not in codes_connus:
            return False
        try:
            data = {'code': code, 'nom': _cell(valeurs, 'nom'), 'parent': None, 'equipe': None,
                    **_task_template_data_commune(valeurs)}
        except ValueError as exc:
            errors.append({'ligne': numero, 'code': code, 'erreurs': {'detail': str(exc)}})
            return True

        if code_parent:
            parent = TaskTemplate.objects.filter(organisation=organisation, code__iexact=code_parent).first()
            data['parent'] = parent.id if parent else None
        equipe = _resoudre_equipe(organisation, _cell(valeurs, 'equipe'))
        if equipe is not None:
            data['equipe'] = equipe.id

        serializer = TaskTemplateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            created.append(serializer.instance)
            codes_connus.add(code.lower())
        else:
            errors.append({'ligne': numero, 'code': code, 'erreurs': serializer.errors})
        return True

    restants = _resolution_par_passes(en_attente, resoudre)
    for code, (numero, _valeurs) in restants.items():
        errors.append({'ligne': numero, 'code': code, 'erreurs': {'parent': 'Code parent introuvable (dépendance manquante ou circulaire).'}})
    return created, errors, []


def _import_task_templates_par_niveau(rows, organisation, request):
    """Format alternatif d'un export existant (colonnes No / Code / Nom / Equipe / Niveau, sans
    « Code parent ») : la hiérarchie est déduite de la colonne « Niveau » (profondeur), en ordre
    séquentiel — chaque ligne descend d'la dernière ligne rencontrée au niveau juste au-dessus,
    comme un plan hiérarchique Excel classique. Seul le premier niveau doit porter une équipe
    reconnue (les niveaux suivants l'héritent automatiquement, voir TaskTemplateSerializer.create) ;
    un code déjà utilisé ailleurs dans le fichier (copié-collé d'un même sous-modèle sous plusieurs
    branches) est automatiquement rendu unique en le préfixant par le code de son parent, plutôt que
    de faire échouer l'import de la ligne."""
    codes_connus = {c.lower() for c in TaskTemplate.objects.filter(organisation=organisation).values_list('code', flat=True)}
    codes_vus = set()
    noms_vus = set()
    created = []
    errors = []
    avertissements = []

    def parse_niveau(valeurs):
        texte = _cell(valeurs, 'niveau', 'niveau hierarchique', 'profondeur')
        try:
            return int(texte) if texte else None
        except ValueError:
            return None

    niveaux = [parse_niveau(valeurs) for _numero, valeurs in rows]
    # pile[n] = instance TaskTemplate du dernier élément créé au niveau n, ou 'echec' si sa
    # création (ou celle d'un de ses propres ancêtres) a échoué — pour que toute sa descendance
    # soit alors signalée d'une seule ligne d'erreur explicite plutôt que rejouer la même erreur.
    pile = {}

    for index, (numero, valeurs) in enumerate(rows):
        code_brut = _cell(valeurs, 'code')
        if not code_brut:
            errors.append({'ligne': numero, 'code': '', 'erreurs': {'code': 'Le code est obligatoire.'}})
            continue
        niveau = niveaux[index]
        if not niveau or niveau < 1:
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {'niveau': 'Le niveau doit être un nombre entier supérieur ou égal à 1.'}})
            continue
        for n in [n for n in pile if n >= niveau]:
            del pile[n]

        parent = pile.get(niveau - 1) if niveau > 1 else None
        if niveau > 1 and parent is None:
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {
                'niveau': f'Aucun élément de niveau {niveau - 1} ne précède cette ligne dans le fichier : vérifiez l’ordre et la colonne « Niveau ».',
            }})
            pile[niveau] = 'echec'
            continue
        if parent == 'echec':
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {'parent': 'La branche parente de cette ligne n’a pas pu être créée (voir l’erreur plus haut dans le fichier).'}})
            pile[niveau] = 'echec'
            continue

        nom = _cell(valeurs, 'nom')
        equipe = None
        if niveau == 1:
            equipe = (
                _resoudre_equipe(organisation, _cell(valeurs, 'equipe'))
                or _resoudre_equipe(organisation, code_brut)
                or _resoudre_equipe(organisation, nom)
            )
            if equipe is None:
                cible = _cell(valeurs, 'equipe') or nom
                errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {
                    'equipe': f'Aucune équipe de l’organisation ne correspond à « {cible} ». Renommez cette équipe pour qu’elle corresponde, ou créez-la d’abord dans Gestion des équipes.',
                }})
                pile[niveau] = 'echec'
                continue

        # Un même code réutilisé sous plusieurs branches (sous-modèle copié-collé) est rendu
        # unique automatiquement plutôt que de faire échouer la ligne — voir docstring.
        code_final = code_brut
        if code_final.lower() in codes_vus or code_final.lower() in codes_connus:
            base = f'{parent.code}-{code_brut}' if parent is not None else code_brut
            code_final = base
            suffixe = 2
            while code_final.lower() in codes_vus or code_final.lower() in codes_connus:
                code_final = f'{base}-{suffixe}'
                suffixe += 1
            avertissements.append({
                'ligne': numero, 'code': code_brut,
                'message': f'Code « {code_brut} » déjà utilisé ailleurs dans le fichier : importé sous « {code_final} ».',
            })

        # De même, un intitulé réutilisé sous le même parent (copié-collé d'une ligne voisine
        # sans le renommer) est rendu unique plutôt que de faire échouer la ligne — voir
        # TaskTemplateSerializer.validate, qui interdit deux éléments de même nom au même
        # emplacement de l'arborescence.
        parent_id = parent.id if parent is not None else None
        nom_final = nom
        cle_nom = (parent_id, nom_final.strip().lower())
        deja_pris = cle_nom in noms_vus or TaskTemplate.objects.filter(organisation=organisation, parent_id=parent_id, nom__iexact=nom_final).exists()
        if deja_pris:
            suffixe = 2
            while True:
                candidat = f'{nom} ({suffixe})'
                cle_candidat = (parent_id, candidat.strip().lower())
                if cle_candidat not in noms_vus and not TaskTemplate.objects.filter(organisation=organisation, parent_id=parent_id, nom__iexact=candidat).exists():
                    nom_final = candidat
                    cle_nom = cle_candidat
                    break
                suffixe += 1
            avertissements.append({
                'ligne': numero, 'code': code_brut,
                'message': f'Nom « {nom} » déjà utilisé à cet emplacement de l’arborescence : importé sous « {nom_final} ».',
            })
        noms_vus.add(cle_nom)
        nom = nom_final

        # Un élément sans ligne suivante plus profonde n'a pas d'enfant : c'est une tâche
        # élémentaire plutôt qu'un dossier (le fichier n'a pas de colonne « Type »).
        a_des_enfants = index + 1 < len(rows) and niveaux[index + 1] is not None and niveaux[index + 1] > niveau
        type_element = 'dossier' if a_des_enfants else 'tache_elementaire'

        try:
            data = {
                'code': code_final, 'nom': nom, 'parent': parent.id if parent else None,
                'equipe': equipe.id if equipe else None,
                **{**_task_template_data_commune(valeurs), 'type_element': type_element},
            }
        except ValueError as exc:
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {'detail': str(exc)}})
            pile[niveau] = 'echec'
            continue

        serializer = TaskTemplateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            created.append(serializer.instance)
            codes_connus.add(code_final.lower())
            codes_vus.add(code_final.lower())
            pile[niveau] = serializer.instance
        else:
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': serializer.errors})
            pile[niveau] = 'echec'

    return created, errors, avertissements

    return created, errors


class TaskTemplateImportView(APIView):
    """Import du catalogue des tâches (Architecture des tâches). GET : télécharge un modèle
    Excel vierge. POST (multipart, champ `file`) : importe le classeur — le format standard
    (Code / Nom / Code parent / Equipe...) et un format alternatif à plat avec une colonne
    « Niveau » au lieu de « Code parent » (voir _import_task_templates_par_niveau) sont tous
    deux reconnus automatiquement selon les en-têtes présentes."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    HEADERS = ['Code', 'Nom', 'Code parent', 'Equipe', 'Type (Dossier / Tâche élémentaire)',
               'Attribuable (Oui/Non)', 'Récurrente (Oui/Non)', 'Fréquence (Ponctuelle/Récurrente)',
               'Déclenchement (Manuel/Automatique)', 'Priorité (Haute/Moyenne/Basse)',
               'Durée estimée (h)', 'Détails', 'Explication']

    def get(self, request):
        if not can_access_config(request.user):
            raise PermissionDenied('Vous n’êtes pas autorisé à importer le catalogue des tâches.')
        exemples = [
            ['PIL', 'Pilotage', '', 'PIL', 'Dossier', 'Oui', 'Non', 'Ponctuelle', 'Manuel', 'Moyenne', '', 'Dossier racine de l’équipe Pilotage', ''],
            ['PIL-01', 'Chiffrage unitaire', 'PIL', '', 'Tâche élémentaire', 'Oui', 'Non', 'Ponctuelle', 'Manuel', 'Moyenne', '2', 'Exemple de tâche élémentaire', ''],
        ]
        return _modele_xlsx('catalogue-des-taches-modele.xlsx', self.HEADERS, exemples)

    def post(self, request):
        if not can_access_config(request.user):
            raise PermissionDenied('Vous n’êtes pas autorisé à importer le catalogue des tâches.')
        organisation = request.user.organisation
        if not organisation:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        fichier = request.FILES.get('file')
        if not fichier:
            raise ValidationError('Aucun fichier n’a été envoyé.')

        entetes, rows = _read_rows(fichier)
        if 'code parent' in entetes or 'parent' in entetes:
            created, errors, avertissements = _import_task_templates_par_code_parent(rows, organisation, request)
        elif 'niveau' in entetes:
            created, errors, avertissements = _import_task_templates_par_niveau(rows, organisation, request)
        else:
            raise ValidationError(
                'Colonnes non reconnues : le fichier doit contenir une colonne « Code parent » '
                '(format standard) ou « Niveau » (arborescence à plat).'
            )

        return Response({
            'created': len(created),
            'errors': errors,
            'avertissements': avertissements,
            'items': TaskTemplateSerializer(created, many=True, context={'request': request}).data,
        }, status=201 if created else 200)


def _import_lignes_budgetaires_par_code_parent(rows, organisation, request):
    """Format standard (modèle téléchargeable) : la colonne « Code parent » relie explicitement
    chaque ligne à son parent, dans n'importe quel ordre (voir _resolution_par_passes)."""
    codes_connus = {c.lower() for c in LigneBudgetaire.objects.filter(organisation=organisation).values_list('code', flat=True)}
    equipe_id_par_code = dict(
        (code.lower(), equipe_id)
        for code, equipe_id in LigneBudgetaire.objects.filter(organisation=organisation).values_list('code', 'equipe_id')
    )
    en_attente = {}
    codes_vus = set()
    errors = []
    for numero, valeurs in rows:
        code = _cell(valeurs, 'code')
        if not code:
            errors.append({'ligne': numero, 'code': '', 'erreurs': {'code': 'Le code est obligatoire.'}})
            continue
        if code.lower() in codes_vus:
            errors.append({'ligne': numero, 'code': code, 'erreurs': {'code': 'Ce code apparaît plusieurs fois dans le fichier.'}})
            continue
        codes_vus.add(code.lower())
        en_attente[code] = (numero, valeurs)

    created = []

    def resoudre(code, numero, valeurs):
        code_parent = _cell(valeurs, 'code parent', 'parent')
        if code_parent and code_parent.lower() not in codes_connus:
            return False
        try:
            data = {
                'code': code,
                'nom': _cell(valeurs, 'nom'),
                'parent': None,
                'equipe': None,
                'declinaison': _cell(valeurs, 'declinaison'),
                'montant_prevu': _decimal_cell(valeurs, 'montant prevu', 'montant'),
            }
        except ValueError as exc:
            errors.append({'ligne': numero, 'code': code, 'erreurs': {'detail': str(exc)}})
            return True

        if code_parent:
            parent = LigneBudgetaire.objects.filter(organisation=organisation, code__iexact=code_parent).first()
            data['parent'] = parent.id if parent else None
        equipe = _resoudre_equipe(organisation, _cell(valeurs, 'equipe'))
        if equipe is None and code_parent:
            # Équipe non précisée sur une sous-ligne : hérite de la ligne parente, comme le
            # catalogue des tâches (voir TaskTemplateSerializer.create).
            parent_equipe_id = equipe_id_par_code.get(code_parent.lower())
            if parent_equipe_id:
                equipe = Team.objects.filter(pk=parent_equipe_id).first()
        if equipe is not None:
            data['equipe'] = equipe.id

        serializer = LigneBudgetaireCreateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            created.append(serializer.instance)
            codes_connus.add(code.lower())
            equipe_id_par_code[code.lower()] = serializer.instance.equipe_id
        else:
            errors.append({'ligne': numero, 'code': code, 'erreurs': serializer.errors})
        return True

    restants = _resolution_par_passes(en_attente, resoudre)
    for code, (numero, _valeurs) in restants.items():
        errors.append({'ligne': numero, 'code': code, 'erreurs': {'parent': 'Code parent introuvable (dépendance manquante ou circulaire).'}})
    return created, errors, []


def _import_lignes_budgetaires_par_niveau(rows, organisation, request):
    """Format alternatif d'un export existant (colonnes No / Codes / Lignes budgétaires / Equipes
    / Niveaux[/ Type], sans « Code parent ») : même principe que
    _import_task_templates_par_niveau, adapté à LigneBudgetaire — arborescence à 3 niveaux
    maximum (voir LigneBudgetaireCreateSerializer.validate_parent), équipe obligatoire sur toute
    ligne (héritée automatiquement du parent pour les niveaux 2 et 3, cette fois calculée ici
    puisque le serializer ne le fait pas lui-même contrairement à TaskTemplateSerializer.create)."""
    codes_connus = {c.lower() for c in LigneBudgetaire.objects.filter(organisation=organisation).values_list('code', flat=True)}
    codes_vus = set()
    created = []
    errors = []
    avertissements = []

    def parse_niveau(valeurs):
        texte = _cell(valeurs, 'niveau', 'niveaux', 'niveau hierarchique', 'profondeur')
        try:
            return int(texte) if texte else None
        except ValueError:
            return None

    niveaux = [parse_niveau(valeurs) for _numero, valeurs in rows]
    pile = {}

    for index, (numero, valeurs) in enumerate(rows):
        code_brut = _cell(valeurs, 'code', 'codes')
        if not code_brut:
            errors.append({'ligne': numero, 'code': '', 'erreurs': {'code': 'Le code est obligatoire.'}})
            continue
        niveau = niveaux[index]
        if not niveau or niveau < 1:
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {'niveau': 'Le niveau doit être un nombre entier supérieur ou égal à 1.'}})
            continue
        if niveau > 3:
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {'niveau': 'L’architecture monétaire est limitée à 3 niveaux (grande catégorie / poste / ligne de détail).'}})
            continue
        for n in [n for n in pile if n >= niveau]:
            del pile[n]

        parent = pile.get(niveau - 1) if niveau > 1 else None
        if niveau > 1 and parent is None:
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {
                'niveau': f'Aucun élément de niveau {niveau - 1} ne précède cette ligne dans le fichier : vérifiez l’ordre et la colonne « Niveau ».',
            }})
            pile[niveau] = 'echec'
            continue
        if parent == 'echec':
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {'parent': 'La branche parente de cette ligne n’a pas pu être créée (voir l’erreur plus haut dans le fichier).'}})
            pile[niveau] = 'echec'
            continue

        nom = _cell(valeurs, 'nom', 'lignes budgetaires', 'ligne budgetaire', 'libelle')
        equipe = (
            _resoudre_equipe(organisation, _cell(valeurs, 'equipe', 'equipes'))
            or (parent.equipe if parent is not None else None)
            or _resoudre_equipe(organisation, code_brut)
            or _resoudre_equipe(organisation, nom)
        )
        if equipe is None:
            cible = _cell(valeurs, 'equipe', 'equipes') or nom
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {
                'equipe': f'Aucune équipe de l’organisation ne correspond à « {cible} ». Renommez cette équipe pour qu’elle corresponde, ou créez-la d’abord dans Gestion des équipes.',
            }})
            pile[niveau] = 'echec'
            continue

        code_final = code_brut
        if code_final.lower() in codes_vus or code_final.lower() in codes_connus:
            base = f'{parent.code}-{code_brut}' if parent is not None else code_brut
            code_final = base
            suffixe = 2
            while code_final.lower() in codes_vus or code_final.lower() in codes_connus:
                code_final = f'{base}-{suffixe}'
                suffixe += 1
            avertissements.append({
                'ligne': numero, 'code': code_brut,
                'message': f'Code « {code_brut} » déjà utilisé ailleurs dans le fichier : importé sous « {code_final} ».',
            })

        try:
            data = {
                'code': code_final, 'nom': nom, 'parent': parent.id if parent else None,
                'equipe': equipe.id,
                'declinaison': _cell(valeurs, 'declinaison'),
                'montant_prevu': _decimal_cell(valeurs, 'montant prevu', 'montant'),
            }
        except ValueError as exc:
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': {'detail': str(exc)}})
            pile[niveau] = 'echec'
            continue

        serializer = LigneBudgetaireCreateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            created.append(serializer.instance)
            codes_connus.add(code_final.lower())
            codes_vus.add(code_final.lower())
            pile[niveau] = serializer.instance
        else:
            errors.append({'ligne': numero, 'code': code_brut, 'erreurs': serializer.errors})
            pile[niveau] = 'echec'

    return created, errors, avertissements


class LigneBudgetaireImportView(APIView):
    """Import de l'architecture monétaire (lignes budgétaires). GET : télécharge un modèle
    Excel vierge. POST (multipart, champ `file`) : importe le classeur — le format standard
    (Code / Nom / Code parent / Equipe...) et un format alternatif à plat avec une colonne
    « Niveau(x) » au lieu de « Code parent » (voir _import_lignes_budgetaires_par_niveau) sont
    tous deux reconnus automatiquement selon les en-têtes présentes."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    HEADERS = ['Code', 'Nom', 'Code parent', 'Equipe', 'Déclinaison', 'Montant prévu']

    def get(self, request):
        if not can_access_config(request.user):
            raise PermissionDenied('Vous n’êtes pas autorisé à importer l’architecture monétaire.')
        exemples = [
            ['A', 'Fonctionnement', '', 'RES', '', ''],
            ['AA', 'Carburant', 'A', '', 'Parc automobile', '1000000'],
        ]
        return _modele_xlsx('architecture-monetaire-modele.xlsx', self.HEADERS, exemples)

    def post(self, request):
        if not can_access_config(request.user):
            raise PermissionDenied('Vous n’êtes pas autorisé à importer l’architecture monétaire.')
        organisation = request.user.organisation
        if not organisation:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        fichier = request.FILES.get('file')
        if not fichier:
            raise ValidationError('Aucun fichier n’a été envoyé.')

        entetes, rows = _read_rows(fichier)
        if 'code parent' in entetes or 'parent' in entetes:
            created, errors, avertissements = _import_lignes_budgetaires_par_code_parent(rows, organisation, request)
        elif 'niveau' in entetes or 'niveaux' in entetes:
            created, errors, avertissements = _import_lignes_budgetaires_par_niveau(rows, organisation, request)
        else:
            raise ValidationError(
                'Colonnes non reconnues : le fichier doit contenir une colonne « Code parent » '
                '(format standard) ou « Niveau » (arborescence à plat).'
            )

        return Response({
            'created': len(created),
            'errors': errors,
            'avertissements': avertissements,
            'items': LigneBudgetaireSerializer(created, many=True, context={'request': request}).data,
        }, status=201 if created else 200)


def _modele_xlsx(nom_fichier, headers, exemples):
    from django.http import HttpResponse

    classeur = openpyxl.Workbook()
    feuille = classeur.active
    feuille.append(headers)
    for cell in feuille[1]:
        cell.font = Font(bold=True)
    for row in exemples:
        feuille.append(row)
    for colonne in feuille.columns:
        largeur = max(len(str(cell.value)) if cell.value is not None else 0 for cell in colonne)
        feuille.column_dimensions[colonne[0].column_letter].width = min(max(largeur + 2, 12), 40)

    tampon = io.BytesIO()
    classeur.save(tampon)
    tampon.seek(0)
    response = HttpResponse(
        tampon.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
    return response
