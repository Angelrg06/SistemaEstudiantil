import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstudianteNotificaciones } from './estudiante-notificaciones';

describe('EstudianteNotificaciones', () => {
  let component: EstudianteNotificaciones;
  let fixture: ComponentFixture<EstudianteNotificaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstudianteNotificaciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstudianteNotificaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
