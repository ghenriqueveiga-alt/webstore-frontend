import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavoritesIcon } from './favorites-icon';

describe('FavoritesIcon', () => {
  let component: FavoritesIcon;
  let fixture: ComponentFixture<FavoritesIcon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavoritesIcon]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FavoritesIcon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
