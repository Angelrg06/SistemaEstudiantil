import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardActividadesChart } from './dashboard-actividades-chart';

describe('DashboardActividadesChart', () => {
  let component: DashboardActividadesChart;
  let fixture: ComponentFixture<DashboardActividadesChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardActividadesChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardActividadesChart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
