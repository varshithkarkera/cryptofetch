"""Run: python -m unittest tests.test_cryptofetch -v   (LIVE=1 also hits the real exchange APIs)"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import cryptofetch as c  # noqa: E402

DAY = 86_400_000
START = 1_762_732_800_000  # 2025-11-10 00:00 UTC


class ParsePair(unittest.TestCase):
    def test_styles(self):
        for text in ("BTCUSDT", "btc-usdt", "BTC_USDT", "btc/usdt"):
            self.assertEqual(c.parse_pair(text, "USD"), ("BTC", "USDT"))

    def test_coin_only_uses_default_quote(self):
        self.assertEqual(c.parse_pair("sol", "USDT"), ("SOL", "USDT"))
        self.assertEqual(c.parse_pair("eth", "USD"), ("ETH", "USD"))

    def test_empty(self):
        self.assertIsNone(c.parse_pair("  ", "USDT"))


class Symbols(unittest.TestCase):
    def test_exchange_symbol_style(self):
        got = {e.id: e.symbol("BTC", e.default_quote) for e in c.EXCHANGES}
        self.assertEqual(got, {"binance": "BTCUSDT", "okx": "BTC-USDT", "coinbase": "BTC-USD",
                               "bitget": "BTCUSDT", "gate": "BTC_USDT"})

    def test_lookup(self):
        self.assertEqual(c.get_exchange("OKX").id, "okx")
        self.assertIsNone(c.get_exchange("nope"))

    def test_intervals_are_known(self):
        for e in c.EXCHANGES:
            self.assertTrue(set(e.intervals) <= set(c.INTERVALS), e.id)


class Helpers(unittest.TestCase):
    def test_finish_sorts_dedupes_and_clips(self):
        rows = [[3 * DAY], [1 * DAY], [1 * DAY], [9 * DAY]]
        self.assertEqual(c.finish(rows, 1 * DAY, 3 * DAY), [[1 * DAY], [3 * DAY]])

    def test_close_ms(self):
        self.assertEqual(c.close_ms(0, "1h"), 3_599_999)
        self.assertEqual(c.close_ms(0, "1M"), "")


@unittest.skipUnless(os.environ.get("LIVE"), "set LIVE=1 to call the real exchange APIs")
class Live(unittest.TestCase):
    def test_every_exchange_returns_normalized_rows(self):
        for e in c.EXCHANGES:
            base, quote = "BTC", e.default_quote
            self.assertTrue(e.ticker(base, quote), e.id)
            self.assertFalse(e.ticker("FOOBARX", quote), e.id)
            rows = e.candles(base, quote, "1h", START, START + 2 * DAY, lambda f: None)
            self.assertEqual(len(rows), 49, e.id)
            self.assertTrue(all(len(r) == 12 for r in rows), e.id)
            self.assertEqual(rows[0][0], START, e.id)


if __name__ == "__main__":
    unittest.main()
