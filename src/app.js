const express = require('express');
const bodyParser = require('body-parser');
const { sequelize, Job } = require('./model')
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

/**
 * @returns *_POST_** `/jobs/:job_id/pay` - Pay for a job, 
 * a client can only pay if his balance >= the amount to pay. 
 * The amount should be moved from the client's balance to the contractor balance.
*/
app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models')
    const { job_id } = req.params
    const job = await Job.findOne({
        where: {
            id: job_id,
            paid: null
        },
        include: [{
            model: Contract,
            where: {
                ClientId: req.profile.id
            }
        }]
    })
    if (!job) return res.status(404).end()
    const client = await Profile.findOne({
        where: {
            id: req.profile.id
        }
    })
    const contractor = await Profile.findOne({
        where: {
            id: job.Contract.ContractorId
        }
    })
    if (client.balance < job.price) return res.status(400).end()
    client.balance -= job.price
    contractor.balance += job.price
    job.paymentDate = new Date()
    job.paid = true
    await client.save()
    await contractor.save()
    await job.save()
    res.json(job)
})

/**
 * @returns Deposits money into the the balance of a client, a client 
 * can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
*/
app.post('/balances/deposit/:userId', getProfile, async (req, res) => {
    const { Profile, Job, Contract } = req.app.get('models')
    const { userId } = req.params
    const { amount } = req.body
    const client = await Profile.findOne({
        where: {
            id: userId
        }
    })
    if (!client) return res.status(404).end()
    const jobs = await Job.findAll({
        where: {
            paid: null
        },
        include: [{
            model: Contract,
            where: {
                ClientId: client.id
            }
        }]
    })
    const total = jobs.reduce((acc, job) => acc + job.price, 0)
    if (amount > total * 0.25) return res.status(400).end()
    client.balance += amount
    await client.save()
    res.json(client)
})

module.exports = app;
