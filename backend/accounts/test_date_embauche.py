from django.utils import timezone
from django.test import TestCase

from .models import Organisation, User
from .serializers import EmployeeAdminEditSerializer


class DateEmbaucheObligatoireTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name='Embauche', org_type='company', currency_code='XAF')

    def test_user_without_hire_date_starts_today(self):
        user = User.objects.create_user(email='sans.date@embauche.test', password='x', organisation=self.org)
        self.assertEqual(user.date_embauche, timezone.localdate())

    def test_admin_edit_cannot_clear_hire_date(self):
        user = User.objects.create_user(email='edit@embauche.test', password='x', organisation=self.org)
        serializer = EmployeeAdminEditSerializer(user, data={'date_embauche': None}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('date_embauche', serializer.errors)
