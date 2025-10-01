import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {PublicLayoutComponent} from "./pages/public-layout/public-layout.component";
import { LandComponent } from './pages/land/land.component';
import {LoginComponent} from "./pages/login/login.component";

import {authGuard} from "./guards/auth.guard";
import {MainLayoutComponent} from "./pages/layout/main-layout.component";
import { HomeComponent } from './pages/home/home.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

import {NotFoundComponent} from './pages/not-found/not-found.component';

import {PlayerComponent} from './pages/player/player.component';
import {EntitiesComponent} from './pages/entities/entities.component';
import {Uploader2Component} from './pages/uploader2/uploader2.component';

const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/land/land.component').then(m => m.LandComponent) },
      { path: 'login', component: LoginComponent }
    ]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivateChild: [authGuard],
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'dashboard', component: DashboardComponent },
//
      { path: 'uploader2', component: Uploader2Component },
      { path: 'entities', component: EntitiesComponent },
      { path: 'player', component: PlayerComponent },
//
      { path: 'alerts', loadComponent: () => import('./pages/alerts/alerts.component').then(m => m.AlertsComponent) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'activity', loadComponent: () => import('./pages/activity/activity.component').then(m => m.ActivityComponent) },
//
      { path: 'interview/online/create', loadComponent: () => import('./pages/interview/wizard/create/online/online-wizard.component').then(m => m.OnlineInterviewWizardComponent) },
      { path: 'interview/offline/create', loadComponent: () => import('./pages/interview/wizard/create/offline/offline-wizard.component').then(m => m.OfflineInterviewWizardComponent) },
      { path: 'interview/edit/:uuid', loadComponent: () => import('./pages/interview/interview-editor.component').then(m => m.InterviewEditorComponent) },
      { path: 'interview/list', loadComponent: () => import('./pages/interview/list/list.component').then(m => m.ListComponent) },
      { path: 'interview/:uuid', loadComponent: () => import('./pages/interview/detail/detail.component').then(m => m.DetailComponent) },
      { path: 'report/create', loadComponent: () => import('./pages/report/report-wizard.component').then(m => m.ReportWizardComponent) },
      { path: 'report/edit/:uuid', loadComponent: () => import('./pages/report/report-editor.component').then(m => m.ReportEditorComponent) },
      { path: 'report/list', loadComponent: () => import('./pages/report/list/list.component').then(m => m.ListComponent) },
      { path: 'report/:uuid', loadComponent: () => import('./pages/report/detail/detail.component').then(m => m.DetailComponent) }
    ]
  },
  { path: '**', redirectTo: '/page-not-found' }
];




@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
