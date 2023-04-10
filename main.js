// GENERAL FUNCTIONS
//  function to round numbers to 2 decimal places
function round(value, decimals) {
    value = Number(value)
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function plot_crime( lat, lon){

    let where = `$where=within_circle(Lon_Lat,${lat},${lon},1000) AND year > 2016 AND ofns_desc NOT IN ("ADMINISTRATIVE CODE","OFFENSES AGAINST PUBLIC ADMINISTRATION","FRAUDS","OTHER STATE LAWS (NON PENAL LA","GAMBLING", "FOR OTHER AUTHORITIES","NEW YORK CITY HEALTH CODE", "CHILD ABANDONMENT/NON SUPPORT 1", "UNAUTHORIZED USE OF A VEHICLE 3 (UUV)","", "FORGERY", "MISCELLANEOUS PENAL LAW","OTHER STATE LAWS (NON PENAL LAW)")`
    let select = '&$select= ofns_desc, COUNT(ofns_desc) as count, date_extract_y(arrest_date) as year'
    let groupby = '&$group=year, ofns_desc'
    let arr_url = `https://data.cityofnewyork.us/resource/8h9b-rp9u.json?${where}${select}${groupby}`

    let response_crime = axios.get(arr_url)
        .then(function (response_crime) {
            let crime = response_crime.data

            let traces = [];
            // iterate over each unique ofns_desc in crime
            let unique_crime = [...new Set(crime.map(item => item.ofns_desc))];

            // sort crimes by total count
            unique_crime.sort(function (a, b) {
                let crime_a = crime.filter(item => item.ofns_desc === a)
                let crime_b = crime.filter(item => item.ofns_desc === b)
                let count_a = crime_a.reduce((a, b) => a + parseInt(b.count), 0)
                let count_b = crime_b.reduce((a, b) => a + parseInt(b.count), 0)
                return count_b - count_a
            });

            for (let i = 0; i < unique_crime.length; i++) {
                let crime_type = unique_crime[i]
                // filter data by crime type
                let crime_type_data = crime.filter(item => item.ofns_desc === crime_type)

                // extract year values and count values to array
                let years = crime_type_data.map(item => item.year)
                let counts = crime_type_data.map(item => item.count)

                // create a trace for each crime type
                let trace = {
                    x: years,
                    y: counts,
                    name: crime_type,
                    stackgroup: 'one',
                    hovertemplate: `${crime_type}<br>Year: %{x}<br>Count: %{y}<extra></extra>`,
                }

                traces.push(trace)
            }
            var crime_layout = {
                autosize: true,
                showlegend: false,
                height: 150,
                title: {
                    text:'Arrests with in 1000m.',
                    font: {
                      family: 'Arial, sans-serif',
                      weight: 800,
                      size: 14
                    },
                    xref: 'paper',
                    x: 0,
                  },
                margin: {
                  l: 25,
                  r: 0,
                  b: 25,
                  t: 25,
                  pad: 0
                },
                paper_bgcolor: 'white',
                plot_bgcolor: 'white'
              };
            
            Plotly.newPlot('crime', traces, crime_layout,{displayModeBar: false});
        })
}

function plot_311( lat, lon ){
    // make a request to the 311 api using lat lon since last year
    // let no_agency = "HPD"
    // let no_complaint = Food Poisoning, Adopt-A-Basket, HEAT/HOT WATER, WATER LEAK, Street Light Condition , Blocked Driveway, Taxi Complaint, PLUMBING    

    const url311 = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$select=unique_key,latitude,longitude,complaint_type,descriptor,created_date,resolution_description&$where=within_circle(location,${lat},${lon},200) and date_extract_y(created_date)>2022 and agency not in ('HDP') and complaint_type not in ('Blocked Driveway','Illegal Parking')&$limit=250&$order=created_date DESC`
    let response311 = axios.get(url311)
        .then(function (response311) {

            // counts complaints by types and type it out to the summary div
            let complaints = response311.data
            let counts = {}
            for (let i = 0; i < complaints.length; i++) {
                let num = complaints[i].complaint_type
                counts[num] = counts[num] ? counts[num] + 1 : 1;
            }

            // get top 5 complatins
            let sortable = [];
            for (let complaint in counts) {
                sortable.push([complaint, counts[complaint]]);
            }
            sortable.sort(function (a, b) {
                return b[1] - a[1];
            });
            let top5 = sortable.slice(0, 5)

            let summary = document.getElementById("summary")
            summary.innerHTML = '<h4 id="top">Top 5 Complaints</h4>'

            for (let i = 0; i < top5.length; i++) {
                summary.innerHTML += `${top5[i][0]}: ${top5[i][1]}<br>`
            }

            // loop through the data and add a marker to the map
            for (let i = 0; i < response311.data.length; i++) {
                let lat311 = response311.data[i].latitude
                let lon311 = response311.data[i].longitude
                let complaint = response311.data[i].complaint_type
                let descriptor = response311.data[i].descriptor
                let date = response311.data[i].created_date
                let resolution = response311.data[i].resolution_description

                // add a circle to the map
                let circle_311 = L.circle([lat311, lon311],{
                    color: 'white',
                    fillColor: 'orange',
                    fillOpacity: 0.4,
                    radius: 6
                }).addTo(map);
                // add a popup to the marker
                // format data as dd-mm-yyyy
                date = date.slice(0, 10).split("-").reverse().join("-")
                circle_311.bindTooltip(`<div class="my-tooltip"><b>${complaint}</b><br><br>${descriptor}</div>`);
            }
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        })
}

function map_pluto(lat, lon){

    // make a request to the map pluto api using lat lon
    let add = 0.00075
    let pluto_url = `https://data.cityofnewyork.us/resource/64uk-42ks.json?$where=latitude>${ Number(lat)-add} AND latitude<${Number(lat)+add} AND longitude>${Number(lon)-add} AND longitude<${Number(lon)+add}`

    // query the api
    let response_pluto = axios.get(pluto_url)
        .then(function (response_pluto) {
            console.log(response_pluto.data);
            // iterate over the data and add a circle to the map
            for (let i = 0; i < response_pluto.data.length; i++) {
                let lot = response_pluto.data[i]
                let p_lat = Number(lot.latitude)
                let p_lon = Number(lot.longitude)

                let circle = new L.Circle([p_lat,p_lon],{
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 1,
                    radius: 3
                }).addTo(map);
                // add a popup to the marker

                circle.bindPopup(`<b>${lot.address}</b><br><br>Land Use: ${lot.landuse}<br>Year Built: ${lot.yearbuilt}<br>Alteration 1: ${lot.yearalter1}<br>Alteration 2: ${lot.yearalter2}<br>Residential Area: ${numberWithCommas(round(lot.resarea,2))}<br>Building Area: ${round(lot.bldgarea,2)}<br>FAR: ${round(lot.residfar,2)}<br>Built FAR: ${round(lot.builtfar,2)}<br>Units: ${lot.unitsres}<br>School Dist: ${lot.schooldist}<br>Assesed Values: $${round(lot.assesstot,0)}`);
            }
        });
}

function plot_collusions( lat, lon ){

    select = '&$select=date_extract_y(crash_date) as year,SUM(number_of_persons_injured) as injured, SUM(number_of_persons_killed) as killed, SUM(number_of_pedestrians_injured) as ped_injured, SUM(number_of_pedestrians_killed) as ped_killed, SUM(number_of_cyclist_injured) as cyclist_injured, SUM(number_of_cyclist_killed) as cyclist_killed, SUM(number_of_motorist_injured) as motorist_injured, SUM(number_of_motorist_killed) as motorist_killed'
    groupby = '&$group=year'
    collusions = `https://data.cityofnewyork.us/resource/h9gi-nx95.json?$where=within_circle(location,${lat},${lon},1000)${select}${groupby}`

    let response_collusions = axios.get(collusions)
    response_collusions.then(function (response_collusions) {
        let collusion_data = response_collusions.data
        console.log( collusion_data );

        let columns = ['cyclist_injured', 'cyclist_killed', 'motorist_injured', 'motorist_killed', 'ped_injured', 'ped_killed' ]
        let collusion_traces = []

        for (let i = 0; i < columns.length; i++) {

            let col = columns[i]
            // get years as a lit
            let years = collusion_data.map( x => x.year )
            // get column data as a list
            let counts = collusion_data.map( x => x[col] )

            let trace = {
                x: years,
                y: counts,
                name: columns[i],
                stackgroup: 'two',
            }
            collusion_traces.push(trace)
        }

        let collusion_layout = {
            autosize: true,
            showlegend: false,
            height: 150,
            hovermode: 'x unified',
            title: {
                text:'Vehicle Collusions with in 1000m.',
                font: {
                  family: 'Arial, sans-serif',
                  weight: 800,
                  size: 14
                },
                xref: 'paper',
                x: 0,
              },
            margin: {
              l: 25,
              r: 0,
              b: 25,
              t: 25,
              pad: 0
            },
            paper_bgcolor: 'white',
            plot_bgcolor: 'white'
          };

        Plotly.newPlot('collusions', collusion_traces, collusion_layout,{displayModeBar: false});
    });

}


// import leaflet and initialte a map
var map = L.map('map');
// set map view to NYC
map.setView([40.7128, -74.0060], 13);
// set max zoom
map.options.maxZoom = 30;

// import the tile layer
tile_url = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
L.tileLayer( tile_url, {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// when button search is clicked get the value of the input
// and make a request to the nominatim api
document.getElementById("search").addEventListener("click", function () {
    let address = document.getElementById("address").value
    console.log(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${address}&format=json`
    
    //  Continue only if the address has a lat lon
    let response = axios.get(url)
        .then(function (response) {
            // handle success
            let lat = response.data[0].lat
            let lon = response.data[0].lon
            console.log(lat, lon);
            // convert lat and lon to number
            // add a marker to the map
            L.marker([lat, lon]).addTo(map);
            // set the view of the map to the lat and lon of the address
            map.setView([lat, lon], 17);

            // ----- MAP PLUTO ----- //
            map_pluto(lat, lon)
            
            // ----- 311 Data ----- //
            plot_311( lat, lon )
            
            // ----- CRIME DATA ----- //
            plot_crime( lat, lon )

            // ----- COLLISION DATA ----- //
            plot_collusions( lat, lon )

            
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        }
        )
})








