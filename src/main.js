import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5timeline from '@amcharts/amcharts5/timeline';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';
import data from './data/timeline.json' with { type: 'json' };

am5.ready(() => {
  // Root element
  const root = am5.Root.new('chartdiv');
  
  // Set themes
  root.setThemes([am5themes_Dark.new(root)]);
  
  // Create Serpentine chart
  const chart = root.container.children.push(
    am5timeline.SerpentineChart.new(root, {
      levelCount: 6, // Number of serpentine levels
      startLocation: 0.1,
      endLocation: 0.9,
      wheelY: 'zoomX'
    })
  );
  
  // Add scrollbar
  chart.set('scrollbarX', am5.Scrollbar.new(root, {
    orientation: 'horizontal'
  }));
  
  // Y-axis renderer (curved for serpentine effect)
  const yRenderer = am5timeline.AxisRendererCurveY.new(root, {});
  yRenderer.labels.template.setAll({
    centerY: am5.p50,
    centerX: am5.p100,
    fontSize: 11
  });
  yRenderer.grid.template.set('forceHidden', true);
  
  // X-axis renderer (curved timeline)
  const xRenderer = am5timeline.AxisRendererCurveX.new(root, {
    yRenderer: yRenderer,
    strokeDasharray: [2, 3],
    strokeOpacity: 0.5,
    stroke: am5.color(0x666666)
  });
  xRenderer.labels.template.setAll({
    centerY: am5.p50,
    fontSize: 11,
    minPosition: 0.01
  });
  xRenderer.labels.template.setup = function(target) {
    target.set('layer', 30);
    target.set('background', am5.Rectangle.new(root, {
      fill: am5.color(0x000000),
      fillOpacity: 0.8
    }));
  };
  
  // Create Y axis (categories)
  const yAxis = chart.yAxes.push(
    am5xy.CategoryAxis.new(root, {
      maxDeviation: 0,
      categoryField: 'category',
      renderer: yRenderer
    })
  );
  
  // Create X axis (dates)  
  const xAxis = chart.xAxes.push(
    am5xy.DateAxis.new(root, {
      baseInterval: { timeUnit: 'year', count: 1000 }, // Large intervals for BCE dates
      renderer: xRenderer,
      tooltip: am5.Tooltip.new(root, {})
    })
  );
  
  // Process timeline data to match amCharts format
  const processedData = data
    .filter(d => d.Category && d.Category.trim() !== '') // Remove empty categories
    .map(d => {
      // Parse year from Real Year field
      let year;
      if (typeof d['Real Year'] === 'string') {
        year = parseInt(d['Real Year'].replace(/[",]/g, ''));
      } else {
        year = d['Real Year'];
      }
      
      // Handle BCE/CE conversion
      const actualYear = d.Era === 'BCE' ? -Math.abs(year) : Math.abs(year);
      
      // Create start and end dates (make events span 1 year for visibility)
      const startDate = new Date(actualYear > 0 ? actualYear : Math.abs(actualYear), 0, 1);
      const endDate = new Date((actualYear > 0 ? actualYear : Math.abs(actualYear)) + 1, 0, 1);
      
      return {
        category: d.Category,
        start: startDate.getTime(),
        end: endDate.getTime(),
        title: d.Title,
        character: d.Character,
        description: d.Description,
        era: d.Era,
        year: actualYear
      };
    })
    .sort((a, b) => a.start - b.start); // Sort by date
  
  // Set up category colors
  const colorSet = chart.get('colors');
  const categoryColors = {
    'Pieces of Eden': am5.color(0xffd700),
    'Isu': am5.color(0xb0e0e6),
    'Characters': am5.color(0x87cefa),
    'Extinction Events': am5.color(0xff4500),
    'Leap of Faith': am5.color(0x32cd32),
    'Order of the Ancients': am5.color(0xadff2f)
  };
  
  // Set up categories for Y-axis
  const categories = [...new Set(processedData.map(d => d.category))];
  yAxis.data.setAll(categories.map(cat => ({ category: cat })));
  
  // Create column series
  const series = chart.series.push(
    am5timeline.CurveColumnSeries.new(root, {
      xAxis: xAxis,
      yAxis: yAxis,
      baseAxis: yAxis,
      valueXField: 'end',
      openValueXField: 'start',
      categoryYField: 'category',
      layer: 30
    })
  );
  
  // Style the columns
  series.columns.template.setAll({
    height: am5.percent(15),
    strokeOpacity: 0,
    tooltipText: '[bold]{title}[/]\n{character}\n{year} {era}\n{description}'
  });
  
  // Add start bullets
  series.bullets.push(function(root, series, dataItem) {
    const category = dataItem.dataContext.category;
    const circle = am5.Circle.new(root, {
      radius: 4,
      fill: categoryColors[category] || colorSet.getIndex(0),
      strokeWidth: 2,
      strokeOpacity: 0.5,
      layer: 30
    });
    return am5.Bullet.new(root, {
      sprite: circle,
      locationX: 0,
      locationY: 0.5
    });
  });
  
  // Add end bullets
  series.bullets.push(function(root, series, dataItem) {
    const category = dataItem.dataContext.category;
    const circle = am5.Circle.new(root, {
      radius: 4,
      fill: categoryColors[category] || colorSet.getIndex(0),
      strokeWidth: 2,
      strokeOpacity: 0.5,
      layer: 30
    });
    return am5.Bullet.new(root, {
      sprite: circle,
      locationX: 1,
      locationY: 0.5
    });
  });
  
  // Color columns by category
  series.columns.template.adapters.add('fill', function(fill, target) {
    const category = target.dataItem.dataContext.category;
    return categoryColors[category] || colorSet.getIndex(0);
  });
  
  // Add milestone flags for major events
  const lineSeries = chart.series.push(
    am5timeline.CurveLineSeries.new(root, {
      xAxis: xAxis,
      yAxis: yAxis,
      categoryYField: 'category',
      valueXField: 'date'
    })
  );
  
  lineSeries.strokes.template.set('forceHidden', true);
  
  // Create milestone markers for major events
  const milestones = processedData
    .filter(d => 
      d.category === 'Extinction Events' || 
      d.title.includes('Catastrophe') ||
      d.title.includes('War') ||
      d.character === 'Desmond Miles'
    )
    .map(d => ({
      category: d.category,
      date: d.start,
      letter: '!',
      description: d.title
    }));
  
  lineSeries.bullets.push(function(root, series, dataItem) {
    const flag = am5.Tooltip.new(root, {
      centerY: 28,
      paddingBottom: 4,
      paddingLeft: 7,
      paddingRight: 7,
      paddingTop: 4,
      layer: 30
    });
    
    flag.get('background')?.setAll({
      stroke: am5.color(0xff4500),
      fill: am5.color(0xff4500),
      cornerRadius: 0
    });
    
    flag.label.setAll({
      fill: am5.color(0xffffff),
      text: dataItem.dataContext.letter,
      fontSize: '0.8em'
    });
    
    flag.show();
    return am5.Bullet.new(root, {
      sprite: flag,
      locationX: 0.5,
      locationY: 0.5
    });
  });
  
  // Add cursor for interaction
  const cursor = chart.set('cursor', am5timeline.CurveCursor.new(root, {
    behavior: 'zoomX',
    xAxis: xAxis,
    yAxis: yAxis
  }));
  
  // Set data
  series.data.setAll(processedData);
  lineSeries.data.setAll(milestones);
  
  // Initial animations
  series.appear(1000);
  chart.appear(1000, 100);
  
  console.log(`Timeline loaded: ${processedData.length} events across ${categories.length} categories`);
});
