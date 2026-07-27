export interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface PaymentData {
  method: 'credit' | 'boleto' | 'pix';
  cardNumber?: string;
  cardName?: string;
  expiry?: string;
  cvv?: string;
  installments?: number;
}
