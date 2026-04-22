export class Asset {
  constructor(
    public id: string,
    public ticker: string,
    public name: string,
    public type: string,
    public conversionRatio: number,
  ) {}
}
