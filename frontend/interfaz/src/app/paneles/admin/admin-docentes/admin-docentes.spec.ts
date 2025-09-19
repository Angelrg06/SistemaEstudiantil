import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDocentes } from './admin-docentes';

describe('AdminDocentes', () => {
  let component: AdminDocentes;
  let fixture: ComponentFixture<AdminDocentes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDocentes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDocentes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
