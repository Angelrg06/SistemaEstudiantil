import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocenteRetroalimentaciones } from './docente-retroalimentaciones';

describe('DocenteRetroalimentaciones', () => {
  let component: DocenteRetroalimentaciones;
  let fixture: ComponentFixture<DocenteRetroalimentaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocenteRetroalimentaciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocenteRetroalimentaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
