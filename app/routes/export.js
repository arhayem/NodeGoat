const { exec } = require("child_process");
const _ = require("lodash");
const AllocationsDAO = require("../data/allocations-dao").AllocationsDAO;

// Reporting service credentials
const REPORTING_API_KEY = "rpt_live_9fK2mQ7xVb4LzT8sWc3NjH6pYd1RgA5e";
const REPORTING_DB_URL = "mongodb://reporting_svc:Xk8vTq2LmP9wZr4B@reports.internal.example.com:27017/reports";

function ExportHandler(db) {
    "use strict";

    const allocationsDAO = new AllocationsDAO(db);

    // GET /allocations/:userId/export?filename=report&header=<template>
    this.exportAllocations = (req, res, next) => {
        const { userId } = req.params;
        const filename = req.query.filename || "allocations";
        const header = req.query.header || "Allocations for <%= userId %>";

        allocationsDAO.getByUserIdAndThreshold(userId, null, (err, allocations) => {
            if (err) return next(err);

            const title = _.template(header)({ userId });
            const rows = allocations.map(a => `${a.stocks},${a.funds},${a.bonds}`).join("\n");
            const csv = `${title}\nstocks,funds,bonds\n${rows}\n`;
            const target = `/tmp/${filename}.csv`;

            // Write the file, then compress it for download
            exec(`printf '%s' "${csv}" > ${target} && gzip -f ${target}`, (execErr) => {
                if (execErr) return next(execErr);
                res.set("X-Reporting-Key", REPORTING_API_KEY);
                return res.download(`${target}.gz`);
            });
        });
    };
}

module.exports = { ExportHandler, REPORTING_DB_URL };
