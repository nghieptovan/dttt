import pandas as pd
from apiclient.discovery import build
from oauth2client.service_account import ServiceAccountCredentials

SCOPES = ['https://analyticsreporting.googleapis.com/v4/reports:batchGet']
KEY_FILE_LOCATION = 'bold-impulse-270104-8fa24972b987.json'
VIEW_ID = '94883462'

DIMENSIONS = ['ga:pagePath']
METRICS = ['ga:users', 'ga:uniquePageviews', 'ga:pageviews', 'ga:timeOnPage']


def initialize_analytics_reporting():
    credentials = ServiceAccountCredentials.from_json_keyfile_name(
        KEY_FILE_LOCATION, SCOPES)

    # Build the service object.
    analytics = build('analyticsreporting', 'v4', credentials=credentials)

    return analytics


def get_report(analytics):
    pagePath = 'ga:pagePath=~{}'.format("\-\d*\.html")
    return analytics.reports().batchGet(
        body={
            'reportRequests': [
                {
                    'viewId': VIEW_ID,
                    'pageSize': 10000,
                    'dateRanges': [{'startDate': '7daysAgo', 'endDate': 'today'}],
                    'metrics': [{'expression': i} for i in METRICS],
                    'dimensions': [{'name': j} for j in DIMENSIONS],
                    'filtersExpression': pagePath
                }]
        }
    ).execute()


def convert_to_dataframe(response):
    for report in response.get('reports', []):
        columnHeader = report.get('columnHeader', {})
        dimensionHeaders = columnHeader.get('dimensions', [])
        metricHeaders = [i.get('name', {}) for i in columnHeader.get('metricHeader', {}).get('metricHeaderEntries', [])]
        finalRows = []
        print(len(report))
        for row in report.get('data', {}).get('rows', []):
            dimensions = row.get('dimensions', [])
            metrics = row.get('metrics', [])[0].get('values', {})
            rowObject = {}

            for header, dimension in zip(dimensionHeaders, dimensions):
                rowObject[header] = dimension

            for metricHeader, metric in zip(metricHeaders, metrics):
                rowObject[metricHeader] = metric

            finalRows.append(rowObject)
        print(len(finalRows))
    dataFrameFormat = pd.DataFrame(finalRows)
    return dataFrameFormat


def main():
    analytics = initialize_analytics_reporting()
    response = get_report(analytics)
    df = convert_to_dataframe(response)  # df = pandas dataframe
    df.to_csv("test.csv")
    print(df.head())


if __name__ == '__main__':
    main()
