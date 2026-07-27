import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Spiner } from './spiner';

describe('Spiner', () => {
  let component: Spiner;
  let fixture: ComponentFixture<Spiner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Spiner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Spiner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
