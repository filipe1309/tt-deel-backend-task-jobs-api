const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model')
const Op = require('sequelize').Op;
const { getProfile } = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id } = req.params
    const contract = await Contract.findOne({
        where: {
            id,
            ClientId: req.profile.id
        }
    })
    if (!contract) return res.status(404).end()
    res.json(contract)
})

/**
 * @returns Returns a list of contracts belonging to a 
 * user (client or contractor), the list should only contain non terminated 
 * contracts.
 */
app.get('/contracts', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const contracts = await Contract.findAll({
        where: {
            ClientId: req.profile.id,
            status: {
                [Op.not]: 'terminated'
            }
        }
    })
    res.json(contracts)
})

/**
 * @returns Get all unpaid jobs for a user (**_either_** a client or contractor), 
 * for **_active contracts only_**. (in_progress)
*/
app.get('/jobs/unpaid', getProfile, async (req, res) => {
    const { Job, Contract } = req.app.get('models')
    const jobs = await Job.findAll({
        where: {
            paid: null
        },
        include: [{
            model: Contract,
            where: {
                [Op.or]: [
                    { ClientId: req.profile.id },
                    { ContractorId: req.profile.id }
                ],
                status: 'in_progress'
            }
        }]
    })
    res.json(jobs)
})

module.exports = app;
