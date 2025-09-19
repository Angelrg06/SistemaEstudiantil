import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardLastNotificaciones } from './dashboard-last-notificaciones';

describe('DashboardLastNotificaciones', () => {
  let component: DashboardLastNotificaciones;
  let fixture: ComponentFixture<DashboardLastNotificaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLastNotificaciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardLastNotificaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
