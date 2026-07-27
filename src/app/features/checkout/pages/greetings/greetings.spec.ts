import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Greetings } from './greetings';

describe('Greetings', () => {
  let component: Greetings;
  let fixture: ComponentFixture<Greetings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Greetings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Greetings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
