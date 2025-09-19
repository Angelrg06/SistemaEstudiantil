import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardLastDocentes } from './dashboard-last-docentes';

describe('DashboardLastDocentes', () => {
  let component: DashboardLastDocentes;
  let fixture: ComponentFixture<DashboardLastDocentes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLastDocentes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardLastDocentes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
