declare module "google-trends-api" {
  interface Options {
    geo?: string;
    hl?: string;
  }
  function dailyTrends(options?: Options): Promise<string>;
  export { dailyTrends };
}
