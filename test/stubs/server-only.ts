/**
 * Stand-in for the `server-only` package under test.
 *
 * The real module deliberately throws unless resolved through the
 * react-server condition, which is how it stops server modules being pulled
 * into a client bundle. Tests run in plain Node, so importing the real one
 * would fail on modules that are perfectly valid to test.
 */
export {};
