import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuickNotificacionModal } from './quick-notificacion-modal';

describe('QuickNotificacionModal', () => {
  let component: QuickNotificacionModal;
  let fixture: ComponentFixture<QuickNotificacionModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickNotificacionModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuickNotificacionModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
