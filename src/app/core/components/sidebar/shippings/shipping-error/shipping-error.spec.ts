import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShippingError } from './shipping-error';

describe('ShippingError', () => {
  let component: ShippingError;
  let fixture: ComponentFixture<ShippingError>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShippingError]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShippingError);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
