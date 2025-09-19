import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstudianteEntregas } from './estudiante-entregas';

describe('EstudianteEntregas', () => {
  let component: EstudianteEntregas;
  let fixture: ComponentFixture<EstudianteEntregas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstudianteEntregas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstudianteEntregas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
