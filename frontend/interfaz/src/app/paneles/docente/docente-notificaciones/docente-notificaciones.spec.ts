import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocenteNotificaciones } from './docente-notificaciones';

describe('DocenteNotificaciones', () => {
  let component: DocenteNotificaciones;
  let fixture: ComponentFixture<DocenteNotificaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocenteNotificaciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocenteNotificaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
