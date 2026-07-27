import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Shippings } from './shippings';

describe('Shippings', () => {
  let component: Shippings;
  let fixture: ComponentFixture<Shippings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shippings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Shippings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
