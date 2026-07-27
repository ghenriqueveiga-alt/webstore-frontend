import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Subtotal } from './subtotal';

describe('Subtotal', () => {
  let component: Subtotal;
  let fixture: ComponentFixture<Subtotal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Subtotal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Subtotal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
