import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminNotificaciones } from './admin-notificaciones';

describe('AdminNotificaciones', () => {
  let component: AdminNotificaciones;
  let fixture: ComponentFixture<AdminNotificaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminNotificaciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminNotificaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
