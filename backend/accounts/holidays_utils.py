"""Import automatique des jours fériés officiels d'un pays, à la manière de « Jours fériés » dans
Google Calendar : l'admin n'a rien à saisir, le pays de l'organisation suffit. Basé sur le package
`holidays` (calcul algorithmique — dates fixes, Pâques, fêtes islamiques estimées, etc. — pas un
appel réseau), qui couvre plus de 150 pays.
"""
from datetime import date as date_cls

import holidays as holidays_lib
from django.utils import timezone

from .models import PublicHoliday

SUPPORTED_COUNTRY_CODES = set(holidays_lib.list_supported_countries())


def country_is_supported(country_code: str) -> bool:
    return bool(country_code) and country_code.upper() in SUPPORTED_COUNTRY_CODES


def sync_public_holidays(organisation, years=None, created_by=None) -> int:
    """Importe (crée si absents) les jours fériés officiels du pays de `organisation` pour
    `years` (par défaut : année courante + suivante). Ne touche jamais aux jours déjà présents
    (qu'ils soient auto ou manuels) — purement additif, idempotent. Retourne le nombre créé."""
    country_code = (organisation.country_code or '').upper()
    if not country_is_supported(country_code):
        return 0

    if years is None:
        current_year = timezone.now().year
        years = [current_year, current_year + 1]

    by_name: dict[str, list[date_cls]] = {}
    for year in years:
        for holiday_date, name in holidays_lib.country_holidays(country_code, years=year).items():
            by_name.setdefault(name, []).append(holiday_date)

    existing = set(
        organisation.public_holidays.filter(date__in=[d for dates in by_name.values() for d in dates])
        .values_list('date', 'nom')
    )

    created = 0
    for name, dates in by_name.items():
        # Fixe (même jour/mois chaque année) seulement si le nom apparaît sur CHAQUE année
        # demandée et toujours à la même date calendaire — sinon mobile (Pâques, fêtes
        # islamiques estimées, jours « observed » qui ne retombent qu'une année sur deux, etc.).
        recurrente = len(dates) == len(years) and len({(d.month, d.day) for d in dates}) == 1
        for holiday_date in dates:
            if (holiday_date, name) in existing:
                continue
            PublicHoliday.objects.create(
                organisation=organisation, nom=name, date=holiday_date,
                recurrente_annuelle=recurrente, source=PublicHoliday.SOURCE_AUTO, created_by=created_by,
            )
            existing.add((holiday_date, name))
            created += 1

    return created
