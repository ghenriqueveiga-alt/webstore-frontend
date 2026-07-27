import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountIcon } from './account-icon';

describe('AccountIcon', () => {
  let component: AccountIcon;
  let fixture: ComponentFixture<AccountIcon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountIcon]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountIcon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
