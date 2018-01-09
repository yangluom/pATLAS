//********//
// PLOTS  //
//********//

const arraytoHighcharts = (array) => {
  const report = {}
  const exportArray = []
  const categories = []
  // puts every unique entry in array into a unique key in object report
  array.forEach( (el) => {
    report[el] = report[el] + 1 || 1
  })
  for (const entry in report) {
    if ({}.hasOwnProperty.call(report, entry)) {
      exportArray.push({
        name: entry,
        y: report[entry]
      })
      categories.push(entry)
    }
  }
  // returns two arrays: exportArray with the data array and categories
  // array for x labels
  return [exportArray, categories]
}

const axisHighlight = (that, index, color, font) => {
  const newAxis = {
    title: {
      style: {
        fontWeight: font,
        color,
      }
    }
  }

  that.chart.update({
    yAxis: (index === 1) ? [{}, newAxis] : [newAxis, {}],
    xAxis: (index === 1) ? [{}, newAxis] : [newAxis, {}]
  })
}
// object defining colors for each type of plot
const colorsPlot = {
  species: "#058DC7",
  genus: "#50B432",
  family: "#ED561B",
  order: "#DDDF00",
  cluster: "#DF565F",
  resistances: "#24CBE5",
  plasmidfamilies: "#64E572",
  length: "#A9B3CE",
  virulence: "#8773ff"
}

const highLightScatter = (el) => {

  const cat = [el.x, el.x2]
  const points = el.series.chart.series[1].data

  // Exit if the scatter data series is absent
  if ( points.length === 0 ) {
    return
  }

  // Check if each point is within range and modify style attributes
  // accordingly
  let modifiedPoints = []
  for (const p of points) {
    if ( cat[0] <= p.y && p.y < cat[1] ) {
      modifiedPoints.push({x: p.x, y: p.y, marker: {fillColor: "#EF626C", radius: 5, lineColor: "#F9D6EB", lineWidth: 1}})
    } else {
      modifiedPoints.push({x: p.x, y:p.y, marker: {fillColor: "#000501", radius: 3, lineWidth: 0}})
    }
  }

  // Update scatter with modified points
  el.series.chart.series[1].update({
    data: modifiedPoints
  })

  // Highlight currently selected bar
  let modifiedBar = []
  for (const b of el.series.chart.series[0].data) {
    if ( b.index === el.index ) {
      modifiedBar.push({"color": "#4A6EAD"})
    } else {
      modifiedBar.push({"color": colorsPlot.length})
    }
  }
  el.series.chart.series[0].update({
    data: modifiedBar
  })
}

const highlightHist = (el) => {

  const yval = el.y
  const bars = el.series.chart.series[0].data
  const points = el.series.chart.series[1].data

  if ( bars.length === 0 ){
    return
  }

  let modifiedBars = []
  for ( const b of bars ){
    if ( b.x <= yval && yval < b.x2 ) {
      modifiedBars.push({"color": "#4A6EAD"})
    } else {
      modifiedBars.push({"color": colorsPlot.length})
    }
  }
  el.series.chart.series[0].update({data: modifiedBars})

  let modifiedPoints = []
  for ( const p of points ) {
    if ( p.index === el.index ) {
      modifiedPoints.push({x: p.x, y: p.y, marker: {fillColor: "#EF626C", radius: 5, lineColor: "#F9D6EB", lineWidth: 1}})
    } else {
      modifiedPoints.push({x: p.x, y:p.y, marker: {fillColor: "#000501", radius: 3, lineWidth: 0}})
    }
  }
  el.series.chart.series[1].update({
    data: modifiedPoints
  })

}

const resetHighlight = (ch) => {

  let points = ch.series[1].data
  let bars = ch.series[0].data

  let resetPoints = []
  let resetBars = []

  for ( const p of points ) {
    resetPoints.push({x: p.x, y:p.y, marker: {fillColor: "#000501", radius: 3}})
  }

  for ( const b of bars ) {
    resetBars.push({"color": colorsPlot.length})
  }

  ch.series[1].update({data: resetPoints})
  ch.series[0].update({data: resetBars})

}

// function to parse stats //
const statsParser = (accessionResultsList, masterObj, layout, taxaType, sortAlp, sortVal) => {
  $("#loadingImgPlots").hide()
  $("#alertPlot").hide()
  // $("#alertPlotEntries").hide()
  // controls progress bar div
  $("#progressDiv").hide()
  $("#chartContainer1").show()

  // parse the final array
  // here it assures that sorts are made just once
  const finalArray = (sortAlp === true) ? masterObj.sort() : (sortVal === true) ? arraytByValue(masterObj) : masterObj
  const doubleArray = arraytoHighcharts(finalArray)

  // categories have to be added to the xAxis labels
  if (taxaType !== "length") {
    layout.xAxis = {categories: doubleArray[1]}
    // then add the series to the graph itself
    layout.series = [{
      type: "column",
      data: doubleArray[0],
      name: "No. of plasmids",
      showInLegend: false,
      color: colorsPlot[taxaType.replace(" ", "")]
    }]
    // this options allows column plots to show more than 10k plasmids
    layout.plotOptions = {
      column: {
        turboThreshold: 0
      }
    }
    // enable sort buttons again
    $("#sortGraph").removeAttr("disabled")
    $("#sortGraphAlp").removeAttr("disabled")
  } else {
    //converts every element in finalArray to float and then sorts it
    const histoArray = finalArray.map( (e) => { return parseFloat(e) })
      .sort( (a, b) => {
        return a - b
      })
    // returns true if all elements have the same size and thus make only a
    // scatter
    const allEqual = (histoArray) => histoArray.every( (v) => v === histoArray[0] )

    // some defaults comment to both graphs instances, when there are
    // several bins or just one
    const defaultXAxis = {
      labels: {enabled: false},
      categories: accessionResultsList,
      title: {text: null},
      opposite: true
    }

    const defaultYAxis = {
      title: {text: "Sequence size (scatter)"},
      opposite: true
    }

    const defaultSeries = {
      name: "Individual plasmids",
      type: "scatter",
      data: histoArray,
      color: "#000501",
      cursor: "pointer",
      marker: {
        radius: 3
      },
      events: {
        mouseOver: function () {
          axisHighlight(this, 0, "black", "bold")
        },
        mouseOut: function () {
          axisHighlight(this, 0, "#666666", "normal")
        },
      },
      point: {
        events: {
          click: function () {
            clickedHighchart = this.category
            $("#submitButton").click()
            highlightHist(this)
          }
        }
      }
    }

    layout.exporting = {
      buttons: {
        clearHighlight: {
          text: "Clear highlights",
          onclick: function () { resetHighlight(this) },
          buttonSpacing: 8,
          theme: {
            stroke: "#313131"
          }
        }
      }
    }

    // checks if all lengths in array are the same and if so... do not
    // do histogram
    if (allEqual(histoArray) === false) {
      layout.xAxis = [defaultXAxis, {
        title: {text: "Sequence size (histogram)"},
        // opposite: true
      }]
      layout.yAxis = [defaultYAxis, {
        title: {text: "Number of plasmids (histogram)"},
        // opposite: true
      }]
      // tooltip that enables different tooltips on each series
      // series.name is here used to return different tooltips for each
      layout.tooltip = {
        formatter: function () {
          if (this.series.name === "Individual plasmids") {
            return "<b>Accession no.: </b>" +
              this.x + "<br><b>Size (bp): </b>" + this.y
          } else {
            return "<b>No. of plasmids: </b>" + this.y + "<br><b>Range: </b>" +
              Math.floor(this.x + 1) + " - " + Math.floor(this.point.x2)
          }
        }
      }
      layout.series = [{
        type: "histogram",
        name: "Distribution by length",
        xAxis: 1,
        yAxis: 1,
        baseSeries: 1,
        color: colorsPlot[taxaType.replace(" ", "")],
        zIndex: -1,
        cursor: "pointer",
        events: {
          mouseOver: function () {
            axisHighlight(this, 1, "black", "bold")
          },
          mouseOut: function () {
            axisHighlight(this, 1, "#666666", "normal")
          }
        },
        point: {
          events: {
            click: function () {
              highLightScatter(this)
            }
          }
        }
      }, defaultSeries]
    } else {
      // instance for one bin only... no histogram will be shown
      $("#alertPlot").show()
      layout.xAxis = defaultXAxis
      layout.yAxis = defaultYAxis
      layout.tooltip = {
        formatter: function () {
          if (this.series.name === "Individual plasmids") {
            return "<b>Accession no.: </b>" +
              this.x + "<br><b>Size (bp): </b>" + this.y
          }
        }
      }
      layout.series = [defaultSeries]
    }
    // disable sort buttons
    $("#sortGraph").attr("disabled", true)
    $("#sortGraphAlp").attr("disabled", true)
  }
  Highcharts.chart("chartContainer1", layout)
}

const resetProgressBar = () => {
  // resets progressBar
  $("#progressDiv").show()
  $("#chartContainer1").hide()
}

// function to make layout
const layoutGet = (taxaType, length) => {
  return {
    chart: {
      zoomType: "x",
      panKey: "ctrl",   //key used to navigate the graph when zommed
      panning: true     // allow paning of the graph when zommed
    },
    title: {
      text: `${taxaType} plot`
    },
    yAxis: {
      title: {
        text: "Number of selected plasmids"
      }
    },
    exporting: {
      sourceWidth: 1000,
    }
  }
}

// function equivalent to getMetadata but for Database db (plasmidfinder db)
const getMetadataPF = (tempList, taxaType, sortAlp, sortVal) => {
  // resets progressBar
  resetProgressBar()

  let PFList = []

  $.post("api/getplasmidfinder/", { "accession": JSON.stringify(tempList) })
    .then( (results) => {
      // const noUnknowns = tempList.length - results.length
      // for (let i=0; i < noUnknowns; i++) {
      //   PFList.push("unknown")
      // }

      results.map( (data) => {
        const pfName = (data.json_entry.gene === null) ?
          "unknown" : data.json_entry.gene.replace(/['u\[\] ]/g, "").split(",")
        //then if unknown can push directly to array
        if (pfName === "unknown") {
          PFList.push(pfName)
        } else {
          // otherwise needs to parse the array into an array
          for (const i in pfName) {
            if ({}.hasOwnProperty.call(pfName, i)) {
              PFList.push(pfName[i])
              // counter += 1
            }
          }
        }

      })

      // show info on the nodes that are shown
      $("#spanEntries").html(
        `Displaying results for ${results.length} of ${tempList.length} (${((results.length/tempList.length) * 100).toFixed(1)}%) selected plasmids`
      )
      $("#alertPlotEntries").show()

      // EXECUTE STATS
      // if (PFList.length >= tempList.length) {

      const layout = layoutGet(taxaType, [...new Set(PFList)].length)
      statsParser(false, PFList, layout, taxaType, sortAlp, sortVal)
      // }
    })
  return PFList
}

// function equivalent to getMetadata but for Card db
const getMetadataRes = (tempList, taxaType, sortAlp, sortVal) => {
  // TODO this should plot resfinder and card seperately
  // resets progressBar
  resetProgressBar()

  let resList = []
  $.post("api/getresistances/", { "accession": JSON.stringify(tempList) })
    .then( (results) => {
      // const noUnknowns = tempList.length - results.length
      // for (let i=0; i < noUnknowns; i++) {
      //   resList.push("unknown")
      // }
      // resList = Array.from([...Array(noUnknowns)], () => "unknown")
      results.map( (data) => {
        const pfName = (data.json_entry.gene === null) ?
          "unknown" : data.json_entry.gene.replace(/['u\[\] ]/g, "").split(",")
        //then if unknown can push directly to array
        if (pfName === "unknown") {
          resList.push(pfName)
        } else {
          // otherwise needs to parse the array into an array
          for (const i in pfName) {
            resList.push(pfName[i])
          }
        }

      })

      // show info on the nodes that are shown
      $("#spanEntries").html(
        `Displaying results for ${results.length} of ${tempList.length} (${((results.length/tempList.length) * 100).toFixed(1)}%) selected plasmids`
      )
      $("#alertPlotEntries").show()

      // EXECUTE STATS
      // if (resList.length >= tempList.length) {
      const layout = layoutGet(taxaType, [...new Set(resList)].length)
      statsParser(false, resList, layout, taxaType, sortAlp, sortVal)
      // }
    })
  return resList
}

// function equivalent to getMetadata but for Database db (plasmidfinder db)
const getMetadataVir = (tempList, taxaType, sortAlp, sortVal) => {
  // resets progressBar
  resetProgressBar()

  let virList = []
  $.post("api/getvirulence/", { "accession": JSON.stringify(tempList) })
  // when all promises are gathered
    .then( (results) => {
      // const noUnknowns = tempList.length - results.length
      // for (let i=0; i < noUnknowns; i++) {
      //   console.log(results)
      //   virList.push("unknown")
      // }
      results.map( (data) => {
        const virName = (data.json_entry.gene === null) ?
          "unknown" : data.json_entry.gene.replace(/['u\[\] ]/g, "").split(",")
        //then if unknown can push directly to array
        if (virName === "unknown") {
          virList.push(virName)
        } else {
          // otherwise needs to parse the array into an array
          for (const i in virName) {
            if ({}.hasOwnProperty.call(virName, i)) {
              virList.push(virName[i])
            }
          }
        }

      })

      // show info on the nodes that are shown
      $("#spanEntries").html(
        `Displaying results for ${results.length} of ${tempList.length} (${((results.length/tempList.length) * 100).toFixed(1)}%) selected plasmids`
      )
      $("#alertPlotEntries").show()

      // EXECUTE STATS
      // if (virList.length >= tempList.length) {
      // checks whether virList is empty meaning that there are no virulence
      // genes for this selection
      const layout = layoutGet(taxaType, [...new Set(virList)].length)
      statsParser(false, virList, layout, taxaType, sortAlp, sortVal)
      // }
    })

  return virList
}

// metadata handler function

const getMetadata = (tempList, taxaType, sortAlp, sortVal) => {
  // resets progressBar
  resetProgressBar()
  let speciesList = []

  $.post("api/getspecies/", { "accession": JSON.stringify(tempList) })
    .then( (results) => {
      const accessionResultsList = []
      const noUnknowns = tempList.length - results.length
      for (let i=0; i < noUnknowns; i++) {
        speciesList.push("unknown")
      }
      results.map( (result) => {
        // checks if plasmid is present in db
        if (result.plasmid_id !== null) {
          if (taxaType === "species") {
            const speciesName = (result.json_entry.name === null) ? "unknown" : result.json_entry.name.split("_").join(" ")
            // push to main list to control the final of the loop
            speciesList.push(speciesName)
          } else if (taxaType === "genus") {
            const genusName = (result.json_entry.taxa === "unknown") ? "unknown" : result.json_entry.taxa.split(",")[0].replace(/['[]/g, "")
            // push to main list to control the final of the loop
            speciesList.push(genusName)
          } else if (taxaType === "family") {
            const familyName = (result.json_entry.taxa === "unknown") ? "unknown" : result.json_entry.taxa.split(",")[1].replace(/[']/g, "")
            speciesList.push(familyName)
          } else if (taxaType === "order") {
            const orderName = (result.json_entry.taxa === "unknown") ? "unknown" : result.json_entry.taxa.split(",")[2].replace(/['\]]/g, "")
            speciesList.push(orderName)
          } else if (taxaType === "cluster") {
            const clusterName = (result.json_entry.cluster === null) ? "unknown" : result.json_entry.cluster
            speciesList.push(clusterName)
          } else {
            const speciesLength = (result.json_entry.length === null) ? "unknown" : result.json_entry.length
            speciesList.push(speciesLength)
            accessionResultsList.push(result.plasmid_id)
            // assumes that it is length by default
          }
        } else {
          // this adds in the case of singletons
          speciesList.push("singletons") // have no way to know since it is
          // not in db
        }
      })

      // show info on the nodes that are shown
      $("#spanEntries").html(
        `Displaying results for ${results.length} of ${tempList.length} (${((results.length/tempList.length) * 100).toFixed(1)}%) selected plasmids`
      )
      $("#alertPlotEntries").show()

      // if (taxaType === "species") {
      const layout = layoutGet(taxaType, [...new Set(speciesList)].length)
      if (speciesList.length >= tempList.length) { statsParser(accessionResultsList, speciesList, layout, taxaType, sortAlp, sortVal) }
    })
    .catch( (error) => {
      console.log("Error: ", error)
    })
  return speciesList // this is returned async but there is no problem
}

// stats using node colors... if listGiFilter is empty

const statsColor = (g, graphics, mode, sortAlp, sortVal) => {
  let tempListAccessions = []
  g.forEachNode( (node) => {
    const currentNodeUI = graphics.getNodeUI(node.id)
    if (currentNodeUI.color === 0x23A900) { tempListAccessions.push(node.id) }
  })
  // function to get the data from the accessions on the list
  const taxaList = (mode === "plasmid families") ? getMetadataPF(tempListAccessions, mode, sortAlp, sortVal) :
    (mode === "resistances") ? getMetadataRes(tempListAccessions, mode, sortAlp, sortVal) :
      (mode === "virulence") ? getMetadataVir(tempListAccessions, mode, sortAlp, sortVal) :
        getMetadata(tempListAccessions, mode, sortAlp, sortVal)
  return taxaList
}

// repetitive function that is often called by main js
// (visualization_functions.js)
const repetitivePlotFunction = (areaSelection, listGiFilter, clickerButton, g, graphics) => {
  $("#loadingImgPlots").show()
  const listPlots = (areaSelection === false) ?
    getMetadata(listGiFilter, clickerButton, false, false)
    : statsColor(g, graphics, clickerButton, false, false)
  return listPlots
}

const pfRepetitivePlotFunction = (areaSelection, listGiFilter, clickerButton, g, graphics) => {
  $("#loadingImgPlots").show()
  const listPlots = (areaSelection === false) ? getMetadataPF(listGiFilter, clickerButton, false, false)
    : statsColor(g, graphics, clickerButton, false, false)
  return listPlots
}

const resRepetitivePlotFunction = (areaSelection, listGiFilter, clickerButton, g, graphics) => {
  $("#loadingImgPlots").show()
  const listPlots = (areaSelection === false) ? getMetadataRes(listGiFilter, clickerButton, false, false)
    : statsColor(g, graphics, clickerButton, false, false)
  return listPlots
}

const virRepetitivePlotFunction = (areaSelection, listGiFilter, clickerButton, g, graphics) => {
  $("#loadingImgPlots").show()
  const listPlots = (areaSelection === false) ? getMetadataVir(listGiFilter, clickerButton, false, false)
    : statsColor(g, graphics, clickerButton, false, false)
  return listPlots
}
