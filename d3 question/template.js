// ******************** part 1 box plot ********************

// load the data
const socialMedia = d3.csv("socialMedia.csv");

// once the data is loaded, proceed with plotting
socialMedia.then(function(data) {
    // convert strings to numbers so d3 math works right
    data.forEach(function(d) {
        d.Likes = +d.Likes;
    });

    // basic svg setup with margins and inner width/height
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width  = 720;   // total svg width
    const height = 420;   // total svg height
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    // make the svg canvas
    const svg = d3.select("#boxplot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // set up the scales for x and y axes
    const ageGroups = [...new Set(data.map(d => d.AgeGroup))];
    const xScale = d3.scaleBand()
        .domain(ageGroups)
        .range([0, innerW])
        .padding(0.35);
    const yMin = 0;
    const yMax = d3.max(data, d => d.Likes);
    const yScale = d3.scaleLinear()
        .domain([yMin, yMax]).nice()
        .range([innerH, 0]);

    // add the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).ticks(8);

    // draw the axes
    svg.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(xAxis);
    svg.append("g")
        .call(yAxis);

    // add axis labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", innerW / 2)
        .attr("y", innerH + 36)
        .attr("text-anchor", "middle")
        .text("age group");
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -44)
        .attr("text-anchor", "middle")
        .text("number of likes");

    // make a helper function to calculate q1, median, q3, etc for each group
    const rollupFunction = function(groupData) {
        const values = groupData.map(d => d.Likes).sort(d3.ascending);
        const min = d3.min(values);
        const q1 = d3.quantile(values, 0.25);
        const median = d3.quantile(values, 0.5);
        const q3 = d3.quantile(values, 0.75);
        const max = d3.max(values);
        const iqr = q3 - q1;
        return { min, q1, median, q3, max, iqr };
    };

    // group rows by age group and compute summary stats with our rollup helper
    const quantilesByGroups = d3.rollup(data, rollupFunction, d => d.AgeGroup);

    // loop each (age group -> stats) and get x position + band width for drawing
    quantilesByGroups.forEach((q, ageGroup) => {
        const x = xScale(ageGroup);
        const boxWidth = xScale.bandwidth();

        // draw vertical whisker line (min to max)
        svg.append("line")
            .attr("x1", x + boxWidth / 2)
            .attr("x2", x + boxWidth / 2)
            .attr("y1", yScale(q.min))
            .attr("y2", yScale(q.max))
            .attr("stroke", "#555")
            .attr("stroke-width", 1.5);

        // draw the box (from q1 to q3)
        svg.append("rect")
            .attr("x", x)
            .attr("width", boxWidth)
            .attr("y", yScale(q.q3))
            .attr("height", yScale(q.q1) - yScale(q.q3))
            .attr("fill", "#f5f5f5")
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5);

        // draw median line
        svg.append("line")
            .attr("x1", x)
            .attr("x2", x + boxWidth)
            .attr("y1", yScale(q.median))
            .attr("y2", yScale(q.median))
            .attr("stroke", "#333")
            .attr("stroke-width", 2);
    });
});



// ******************** part 2 side-by-side bar plot ********************

// use the cleaned dataset with platform, post type, and average likes
const socialMediaAvg = d3.csv("SocialMediaAvg.csv");

socialMediaAvg.then(function(data) {
    // make sure avg likes is numeric
    data.forEach(d => { d.AvgLikes = +d.AvgLikes; });

    // basic svg setup
    const margin = { top: 20, right: 160, bottom: 60, left: 60 };
    const width  = 720;  // total svg width
    const height = 420;  // total svg height
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    // make the svg canvas
    const svg = d3.select("#barplot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // set up the scales (x0 for platform, x1 for post type, y for likes)
    const platforms = [...new Set(data.map(d => d.Platform))];
    const postTypes = [...new Set(data.map(d => d.PostType))];

    // nested band scales for grouped bars
    const x0 = d3.scaleBand().domain(platforms).range([0, innerW]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(postTypes).range([0, x0.bandwidth()]).padding(0.12);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.AvgLikes)]).nice().range([innerH, 0]);
    const color = d3.scaleOrdinal().domain(postTypes).range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

    // add axes and labels
    svg.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-25)");
    svg.append("g").call(d3.axisLeft(y).ticks(8));

    // axis labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", innerW / 2)
        .attr("y", innerH + 45)
        .attr("text-anchor", "middle")
        .text("platform");
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -44)
        .attr("text-anchor", "middle")
        .text("average likes");

    // group bars by platform and draw each post type inside
    const gPlatform = svg.selectAll(".platform-group")
        .data(platforms)
        .enter()
        .append("g")
        .attr("class", "platform-group")
        .attr("transform", d => `translate(${x0(d)},0)`);

    // draw the bars
    gPlatform.selectAll("rect")
        .data(p => data.filter(d => d.Platform === p))
        .enter()
        .append("rect")
        .attr("x", d => x1(d.PostType))
        .attr("y", d => y(d.AvgLikes))
        .attr("width", x1.bandwidth())
        .attr("height", d => innerH - y(d.AvgLikes))
        .attr("fill", d => color(d.PostType));

    // make a simple legend with color boxes and labels
    const legend = svg.append("g").attr("transform", `translate(${innerW / 2.5}, ${0})`);
    postTypes.forEach((type, i) => {
        legend.append("rect")
            .attr("x", 0).attr("y", i * 20 + 2)
            .attr("width", 12).attr("height", 12)
            .attr("fill", color(type));
        legend.append("text")
            .attr("x", 20).attr("y", i * 20 + 12)
            .attr("alignment-baseline", "middle")
            .text(type);
    });
});


// ******************** part 3 line plot ********************

// load the date vs avg likes data
const socialMediaTime = d3.csv("SocialMediaTime.csv");

socialMediaTime.then(function(data) {
    // make sure avg likes is numeric
    data.forEach(d => { d.AvgLikes = +d.AvgLikes; });

    // setup svg and margins
    const margin = { top: 20, right: 30, bottom: 70, left: 60 };
    const width  = 720;  // total svg width
    const height = 420;  // total svg height
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    // make the svg canvas
    const svg = d3.select("#lineplot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // make scales and axes
    const x = d3.scalePoint().domain(data.map(d => d.Date)).range([0, innerW]).padding(0.5);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.AvgLikes)]).nice().range([innerH, 0]);
    // draw axes
    const gx = svg.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x));
    gx.selectAll("text").style("text-anchor", "end").attr("transform", "rotate(-25)");
    svg.append("g").call(d3.axisLeft(y).ticks(8));

    // add axis labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", innerW / 2)
        .attr("y", innerH + 55)
        .attr("text-anchor", "middle")
        .text("date");
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -44)
        .attr("text-anchor", "middle")
        .text("average likes");

    // draw the line (smooth curve)
    const line = d3.line()
        .x(d => x(d.Date))
        .y(d => y(d.AvgLikes))
        .curve(d3.curveNatural);

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#1f77b4")
        .attr("stroke-width", 2)
        .attr("d", line);

    // add small circles on each point
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.Date))
        .attr("cy", d => y(d.AvgLikes))
        .attr("r", 3)
        .attr("fill", "#1f77b4");
});