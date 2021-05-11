class ValidationResult {
  constructor(private _redirectURL: string | null) {}

  public needRedirect(): boolean {
    return Boolean(this._redirectURL);
  }

  public getRedirectURL(): string | null {
    return this._redirectURL;
  }
}

export default ValidationResult;
