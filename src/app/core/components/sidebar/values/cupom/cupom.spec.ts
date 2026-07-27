import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cupom } from './cupom';

describe('Cupom', () => {
  let component: Cupom;
  let fixture: ComponentFixture<Cupom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cupom]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cupom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
