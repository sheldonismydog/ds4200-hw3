import argparse
from pathlib import Path
import pandas as pd

def main():
    # args: where to read/write
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", "-i", default="socialMedia.csv")
    ap.add_argument("--outdir", "-o", default=".")
    args = ap.parse_args()

    # prepare paths
    inp = Path(args.input)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    # read data
    df = pd.read_csv(inp)

    # make sure likes is numeric
    df["Likes"] = pd.to_numeric(df["Likes"], errors="coerce")

    # file 1: SocialMediaAvg.csv
    # avg likes by platform × post type, rounded to 2 decimals
    avg = (
        df.groupby(["Platform", "PostType"], as_index=False)["Likes"]
          .mean()
          .rename(columns={"Likes": "AvgLikes"})
    )
    avg["AvgLikes"] = avg["AvgLikes"].round(2)
    avg = avg.sort_values(["Platform", "PostType"], kind="stable")
    avg.to_csv(outdir / "SocialMediaAvg.csv", index=False)



    # file 2: SocialMediaTime.csv
    # avg likes by calendar date with real weekday names

    # clean date strings a little: drop any " (something)" suffix and trim spaces
    def clean_date_series(s):
        s = s.astype(str).str.strip()
        s = s.str.replace(r"\s*\(.*\)$", "", regex=True)
        return s

    # try Date first; if it won’t parse, fall back to PostTimestamp
    date_parsed = pd.to_datetime(clean_date_series(df.get("Date", pd.Series(index=df.index))), errors="coerce")
    if date_parsed.isna().all() and "PostTimestamp" in df.columns:
        date_parsed = pd.to_datetime(clean_date_series(df["PostTimestamp"]), errors="coerce")

    # keep rows where we have both a date and a numeric like
    mask = (~date_parsed.isna()) & (~df["Likes"].isna())
    t = df.loc[mask].copy()
    t["CalDate"] = date_parsed.loc[mask].dt.date  # pure date

    # average likes by calendar date
    time_df = (
        t.groupby("CalDate", as_index=False)["Likes"]
         .mean()
         .rename(columns={"Likes": "AvgLikes"})
    )

    # label like "3/1/2024 (Friday)"
    def label_for(d):
        ts = pd.Timestamp(d)
        return f"{d.month}/{d.day}/{d.year} ({ts.strftime('%A')})"

    # create labeled date column and sort
    time_df["Date"] = time_df["CalDate"].apply(label_for)
    time_df = time_df.sort_values("CalDate", kind="stable")[["Date", "AvgLikes"]]
    time_df.to_csv(outdir / "SocialMediaTime.csv", index=False)

    # report
    print("wrote:", outdir / "SocialMediaAvg.csv")
    print("wrote:", outdir / "SocialMediaTime.csv")

# run main to generate csv files
if __name__ == "__main__":
    main()
