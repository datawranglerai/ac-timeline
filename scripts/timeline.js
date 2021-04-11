// Title: First Timeline test
// Objective:
// Author: James Wolman
// Date: 2021-03-30
// Docs: https://www.amcharts.com/docs/v4/chart-types/timeline/
// https://www.amcharts.com/demos/linear-process-diagram/
// https://www.amcharts.com/demos/serpentine-timeline/

am4core.ready(function() {

	// Themes begin
	am4core.useTheme(am4themes_animated);
	// Themes end

	var chart = am4core.create("chartdiv", am4plugins_timeline.SerpentineChart);
	chart.curveContainer.padding(50, 20, 50, 20);
	// chart.levelCount = 4;
	// chart.yAxisRadius = am4core.percent(25);
	// chart.yAxisInnerRadius = am4core.percent(-25);
	// chart.maskBullets = false;

	var colorSet = new am4core.ColorSet();
	colorSet.saturation = 0.5;

	// Set up data source
	chart.dataSource.url = "./data/Assassin's Creed Timeline - Data(2).csv";
	chart.dataSource.parser = new am4core.CSVParser();
	chart.dataSource.parser.options.useColumnNames = true;
	chart.dataSource.parser.options.emptyAs = 0;

	var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
	categoryAxis.dataFields.category = "Game";
	// categoryAxis.renderer.grid.template.disabled = true;
	// categoryAxis.renderer.labels.template.paddingRight = 25;
	// categoryAxis.renderer.minGridDistance = 10;
	// categoryAxis.renderer.innerRadius = -60;
	// categoryAxis.renderer.radius = 60;

	var yearAxis = chart.xAxes.push(new am4charts.ValueAxis());
	// yearAxis.renderer.minGridDistance = 100;
	// yearAxis.renderer.tooltipLocation = 0;
	// yearAxis.startLocation = -0.5;
	// yearAxis.renderer.line.strokeDasharray = "1,4";
	// yearAxis.renderer.line.strokeOpacity = 0.6;
	// yearAxis.tooltip.background.fillOpacity = 0.2;
	// yearAxis.tooltip.background.cornerRadius = 5;
	// yearAxis.tooltip.label.fill = new am4core.InterfaceColorSet().getFor("alternativeBackground");
	// yearAxis.tooltip.label.paddingTop = 7;
	yearAxis.min = -76000;
	yearAxis.max = 2040;
	yearAxis.strictMinMax = true;
	yearAxis.numberFormatter = new am4core.NumberFormatter();
	yearAxis.numberFormatter.numberFormat = "# {Era}[/]"; 

	var labelTemplate = dateAxis.renderer.labels.template;
	labelTemplate.verticalCenter = "middle";
	labelTemplate.fillOpacity = 0.7;
	labelTemplate.background.fill = new am4core.InterfaceColorSet().getFor("background");
	labelTemplate.background.fillOpacity = 1;
	labelTemplate.padding(7, 7, 7, 7);

	var series = chart.series.push(new am4plugins_timeline.CurveColumnSeries());
	// series.columns.template.height = am4core.percent(20);
	// series.columns.template.tooltipText = "{Title}: [bold]{openDateX}[/] - [bold]{dateX}[/]";

	series.dataFields.valueX = "Real Year";
	series.dataFields.categoryY = "Game";
	series.columns.template.propertyFields.fill = "color"; // get color from data
	series.columns.template.propertyFields.stroke = "color";
	series.columns.template.strokeOpacity = 0;

	var bullet = series.bullets.push(new am4charts.CircleBullet());
	bullet.circle.radius = 3;
	bullet.circle.strokeOpacity = 0;
	bullet.propertyFields.fill = "color";
	// bullet.locationX = 0;
	// bullet.tooltipText = "{Title}: [bold]{openDateX}[/]";
	bullet.tooltipText = "{Title}: [bold]{Real Year} {Era}[/]";
	bullet.tooltip.label.maxWidth = 150;
	bullet.tooltip.label.wrap = true;

	// var bullet2 = series.bullets.push(new am4charts.CircleBullet());
	// bullet2.circle.radius = 3;
	// bullet2.circle.strokeOpacity = 0;
	// bullet2.propertyFields.fill = "color";
	// bullet2.locationX = 1;

	// var imageBullet1 = series.bullets.push(new am4plugins_bullets.PinBullet());
	// imageBullet1.disabled = true;
	// imageBullet1.propertyFields.disabled = "disabled1";
	// imageBullet1.locationX = 1;
	// imageBullet1.circle.radius = 20;
	// imageBullet1.propertyFields.stroke = "color";
	// imageBullet1.background.propertyFields.fill = "color";
	// imageBullet1.image = new am4core.Image();
	// imageBullet1.image.propertyFields.href = "image1";

	// var imageBullet2 = series.bullets.push(new am4plugins_bullets.PinBullet());
	// imageBullet2.disabled = true;
	// imageBullet2.propertyFields.disabled = "disabled2";
	// imageBullet2.locationX = 0;
	// imageBullet2.circle.radius = 20;
	// imageBullet2.propertyFields.stroke = "color";
	// imageBullet2.background.propertyFields.fill = "color";
	// imageBullet2.image = new am4core.Image();
	// imageBullet2.image.propertyFields.href = "image2";


	// var eventSeries = chart.series.push(new am4plugins_timeline.CurveLineSeries());
	// eventSeries.dataFields.dateX = "eventDate";
	// eventSeries.dataFields.categoryY = "Game";
	// eventSeries.data = [
	//     { Game: "", eventDate: "2019-01-15", letter: "A", description: "Something happened here" },
	//     { Game: "", eventDate: "2019-01-23", letter: "B", description: "Something happened here" },
	//     { Game: "", eventDate: "2019-02-10", letter: "C", description: "Something happened here" },
	//     { Game: "", eventDate: "2019-02-29", letter: "D", description: "Something happened here" },
	//     { Game: "", eventDate: "2019-03-06", letter: "E", description: "Something happened here" },
	//     { Game: "", eventDate: "2019-03-12", letter: "F", description: "Something happened here" },
	//     { Game: "", eventDate: "2019-03-22", letter: "G", description: "Something happened here" }];
	// eventSeries.strokeOpacity = 0;

	// var flagBullet = eventSeries.bullets.push(new am4plugins_bullets.FlagBullet())
	// flagBullet.label.propertyFields.text = "letter";
	// flagBullet.locationX = 0;
	// flagBullet.tooltipText = "{description}";

	chart.scrollbarX = new am4core.Scrollbar();
	chart.scrollbarX.align = "center"
	chart.scrollbarX.width = am4core.percent(85);

	var cursor = new am4plugins_timeline.CurveCursor();
	chart.cursor = cursor;
	cursor.xAxis = dateAxis;
	cursor.yAxis = categoryAxis;
	cursor.lineY.disabled = true;
	cursor.lineX.strokeDasharray = "1,4";
	cursor.lineX.strokeOpacity = 1;

	// dateAxis.renderer.tooltipLocation2 = 0;
	// categoryAxis.cursorTooltipEnabled = false;


}); // end am4core.ready()