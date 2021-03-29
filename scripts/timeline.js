google.charts.load('current');
google.charts.setOnLoadCallback(init);

function init() {
  var url =
    'https://docs.google.com/spreadsheets/d/1egH9UyswSBBrMV_30KLDsqRoY1GvdeWm-WvhJxW9OB8/edit?usp=sharing';
  var query = new google.visualization.Query(url);
  query.setQuery('select A, B, C, G');
  query.send(processSheetsData);
}

function processSheetsData(response) {
  var array = [];
  var data = response.getDataTable();
  var columns = data.getNumberOfColumns();
  var rows = data.getNumberOfRows();
  for (var r = 0; r < rows; r++) {
    var row = [];
    for (var c = 0; c < columns; c++) {
      	row.push(data.getValue(r, c));
    }
    array.push({
      year: row[0],
      approx: row[1],
      era: row[2],
      title: row[3]
    });
  }
  console.log(array);
  renderData(array);
}

function renderData(data) {

	var tr = d3.select(".timeline-tbl tbody")
		.selectAll("tr")
		.data(data)
		.enter()
		.append("tr");

	var td = d3.select("td")
		.data(function(d) { return d3.values(d); })
		.enter()
		.append("td")
		.text(function(d) { return d; });

	return tr;

}
