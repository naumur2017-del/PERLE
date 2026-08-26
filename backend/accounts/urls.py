from django.urls import path

from . import views

urlpatterns = [
    path('organisations/search/', views.OrganisationSearchView.as_view()),
    path('organisations/register/personal/', views.RegisterPersonalOrganisationView.as_view()),
    path('organisations/register/company/', views.RegisterCompanyOrganisationView.as_view()),
    path('organisations/register/member/', views.RegisterMemberView.as_view()),
    path('auth/login/', views.LoginView.as_view()),
    path('employees/', views.EmployeeListView.as_view()),
    path('employees/me/', views.EmployeeMeView.as_view()),
    path('employees/<int:pk>/', views.EmployeeDetailView.as_view()),
    path('employees/<int:pk>/edit/', views.EmployeeAdminEditView.as_view()),
    path('teams/', views.TeamListCreateView.as_view()),
    path('teams/<int:pk>/', views.TeamDetailView.as_view()),
    path('teams/<int:pk>/add-member/', views.TeamAddMemberView.as_view()),
    path('teams/<int:pk>/remove-member/', views.TeamRemoveMemberView.as_view()),
]
