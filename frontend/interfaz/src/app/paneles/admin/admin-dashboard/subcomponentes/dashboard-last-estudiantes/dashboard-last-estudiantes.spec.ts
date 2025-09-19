import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardLastEstudiantes } from '../dashboard-last-estudiantes/dashboard-last-estudiantes';

describe('DashboardLastEstudiantes', () => {
  let component: DashboardLastEstudiantes;
  let fixture: ComponentFixture<DashboardLastEstudiantes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLastEstudiantes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardLastEstudiantes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
