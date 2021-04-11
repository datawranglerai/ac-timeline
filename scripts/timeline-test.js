// Title: First Timeline test
// Objective:
// Author: James Wolman

am4core.ready(function() {

	// Create a chart instance
	var chart = am4core.create("chartdiv", am4plugins_timeline.CurveChart); 

	// Assign data to the chart's data property
	chart.data = [
		{
			"game": "Watch Dogs: Legion",
			"year": 2030,
			"event": "London Leap of Faith"
		},
		{
			"game": "Assassin's Creed: Revelations",
			"year": 1257,
			"event": "Altair Ibn-La'Ahad Dies"
		},
		// {
		// 	"game": "Assassin's Creed Syndicate",
		// 	"year": -75838,
		// 	"event": "Shroud of Eden"
		// },
		{
			"game": "Assassin's Creed Origins",
			"year": -49,
			"event": "Khemu killed by The Order of the Ancients"
		}
	];

	// Create category (Y) axis
	var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
	categoryAxis.dataFields.category = "game";
	categoryAxis.min = 0;
	categoryAxis.max = 2;
	categoryAxis.strictMinMax = true;
	categoryAxis.renderer.grid.template.disabled = true;
	categoryAxis.renderer.labels.template.disabled = true;
	categoryAxis.renderer.baseGrid.disabled = true;
	categoryAxis.tooltip.disabled = true;

	// Create value (X) axis
	var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
	valueAxis.dataFields.category = "x";
	valueAxis.renderer.grid.template.disabled = true;
	valueAxis.renderer.labels.template.disabled = true;
	valueAxis.tooltip.disabled = true;

	// Create series
	var series = chart.series.push(new am4plugins_timeline.CurveColumnSeries());
	series.dataFields.valueX = "year";
	series.dataFields.categoryY = "game";
	series.strokeWidth = 0;
	series.fillOpacity = 0;

	var bullet = series.bullets.push(new am4charts.CircleBullet());
	bullet.circle.radius = 5;

	// Add some white space around the chart
	chart.padding(40, 40, 40, 40);

	// Add labels
	var labelBullet = series.bullets.push(new am4charts.LabelBullet());
	labelBullet.label.text = "[bold]{year}[/]\n{event}";
	labelBullet.label.maxWidth = 300;
	labelBullet.label.wrap = false;
	labelBullet.label.truncate = false;
	labelBullet.label.textAlign = "middle";
	labelBullet.label.verticalCenter = "bottom";
	labelBullet.label.paddingTop = 20;
	labelBullet.label.paddingBottom = 20;
	labelBullet.label.fill = am4core.color("#999");

	// Chart cursor
	chart.cursor = new am4charts.XYCursor();
	chart.cursor.lineX.disabled = true;
	chart.cursor.lineY.disabled = true;

	


}); // end am4core.ready()