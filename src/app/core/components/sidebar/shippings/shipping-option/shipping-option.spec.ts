import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShippingOption } from './shipping-option';

describe('ShippingOption', () => {
  let component: ShippingOption;
  let fixture: ComponentFixture<ShippingOption>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShippingOption]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShippingOption);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
