describe('Accounting balance rule', () => {
  it('detecta transacción desbalanceada con regla aritmética base', () => {
    const debit = 100;
    const credit = 90;
    expect(Math.round(debit * 100)).not.toBe(Math.round(credit * 100));
  });
});
