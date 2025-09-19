import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUsuarios } from './admin-usuarios';

describe('AdminUsuarios', () => {
  let component: AdminUsuarios;
  let fixture: ComponentFixture<AdminUsuarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsuarios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminUsuarios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
