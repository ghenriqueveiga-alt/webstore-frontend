import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostumerSettings } from './costumer-settings';

describe('CostumerSettings', () => {
  let component: CostumerSettings;
  let fixture: ComponentFixture<CostumerSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CostumerSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostumerSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
