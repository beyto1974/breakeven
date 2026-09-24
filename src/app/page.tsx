import { Report } from "./components/Report";

/**
 * Static export: the HTML ships with the default report, and the client applies
 * the query string on load. Without JavaScript the defaults still read as a
 * complete report.
 */
export default function Page() {
  return <Report />;
}
