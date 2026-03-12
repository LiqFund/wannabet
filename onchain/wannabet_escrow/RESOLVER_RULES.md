# WannaBet Crypto Price Resolver Rules

## Current supported automated market

Only the following automated market is currently supported:

- Market kind: `CryptoPriceBinary`
- Symbol: `BtcUsdt`
- Venue: `BinanceSpot`

Any other automated crypto price market must be treated as unsupported until explicitly added.

## Threshold settlement rule

For threshold crypto price bets, the canonical settlement price is:

- the **close price**
- of the **1 minute Binance spot kline**
- whose **open time in milliseconds equals `settlement_minute_ts * 1000`**

## Candle finality rule

A crypto price bet is **not resolver-ready at `settlement_minute_ts` itself**.

It is only resolver-ready after the full 1 minute candle has closed, meaning:

- `current time >= settlement_minute_ts + 60`

## Why this rule exists

This rule is intentionally strict so settlement is:

- deterministic
- auditable
- repeatable
- free from wick ambiguity
- free from open/high/low/close confusion

## Conversion to on-chain `resolved_price_e8`

The Binance decimal close string must be converted to `resolved_price_e8` by:

- taking the decimal price string
- keeping exactly 8 decimal places
- right-padding with zeros if needed
- removing the decimal point
- storing the resulting integer as `resolved_price_e8`

Example:

- close price: `70338.90000000`
- `resolved_price_e8`: `7033890000000`

## Winner computation rule

For supported threshold bets:

- if comparator is `GreaterThanOrEqual`
  - creator side wins when `resolved_price_e8 >= strike_e8`
- if comparator is `LessThan`
  - creator side wins when `resolved_price_e8 < strike_e8`
- otherwise
  - the market is invalid / unsupported

If the creator side does not win, the accepter side wins.

## Manual resolution policy

Manual `resolve_bet` is disabled for crypto price bets.

Crypto price bets must be resolved through the dedicated crypto price resolver path, which writes:

- `winner_side`
- `resolved_price_e8`
- `resolved_at_ts`
- `resolution_status`

## Operational flow

The current resolver worker flow is:

1. scan chain for locked, pending, supported crypto price bets
2. ensure `current time >= settlement_minute_ts + 60`
3. fetch Binance 1 minute kline for that exact settlement minute
4. read the candle close
5. convert close to `resolved_price_e8`
6. call `resolve_crypto_price_bet`
7. later allow winner to claim winnings

## Future expansion policy

Before adding new automated markets such as:

- `EthUsdt`
- `SolUsdt`
- time-to-touch
- relative performance

the supported symbol / venue / settlement rules must be explicitly added here first.
