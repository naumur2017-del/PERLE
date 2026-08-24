from django.urls import path

from . import views

urlpatterns = [
    path('organisations/search/', views.OrganisationSearchView.as_view()),
    path('organisations/register/personal/', views.RegisterPersonalOrganisationView.as_view()),
    path('organisations/register/company/', views.RegisterCompanyOrganisationView.as_view()),
    path('membership-requests/', views.MembershipRequestCreateView.as_view()),
    path('auth/login/', views.LoginView.as_view()),
]
