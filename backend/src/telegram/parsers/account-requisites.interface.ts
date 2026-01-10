export interface AccountRequisites {
  bankName: string;
  suggestedName: string;
  cardLastFour: string;
  accountNumber: string;
  currency: string;
  ownerName: string;
}

export interface RequisitesParserInterface {
  canParse(text: string): boolean;
  parse(text: string): AccountRequisites | null;
}
