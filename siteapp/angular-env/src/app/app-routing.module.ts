import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {PublicLayoutComponent} from "./pages/public-layout/public-layout.component";
import { LandComponent } from './pages/land/land.component';
import {LoginComponent} from "./pages/login/login.component";
import {authGuard} from "./guards/auth.guard";
import {MainLayoutComponent} from "./pages/layout/main-layout.component";
import { HomeComponent } from './pages/home/home.component';
import {NotFoundComponent} from './pages/not-found/not-found.component';

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
    ]
  },
  { path: '**', redirectTo: '/page-not-found' }
];




@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
