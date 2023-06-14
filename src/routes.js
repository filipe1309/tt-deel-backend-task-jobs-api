const Op = require('sequelize').Op;
const { getProfile } = require('./middleware/getProfile')
const { sequelize } = require('./model')

module.exports = function (app) {
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

        const t = await sequelize.transaction()
        try {
            client.balance -= job.price
            contractor.balance += job.price
            job.paid = true
            job.paymentDate = new Date()
            await client.save({ transaction: t })
            await contractor.save({ transaction: t })
            await job.save({ transaction: t })
            await t.commit()
            res.json(job)
        } catch (e) {
            await t.rollback()
            res.status(500).end()
        }
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

        const t = await sequelize.transaction()
        try {
            client.balance += amount
            await client.save({ transaction: t })
            await t.commit()
            res.json(client)
        } catch (e) {
            await t.rollback()
            res.status(500).end()
        }
    })

    /**
     * @returns Returns the profession that earned the most money (sum of jobs paid)
     * for any contactor that worked in the query time range.
     */
    app.get('/admin/best-profession', async (req, res) => {
        const { Job, Contract, Profile } = req.app.get('models')
        const { start, end } = req.query
        const jobs = await Job.findAll({
            where: {
                paid: true,
                paymentDate: {
                    [Op.between]: [start, end]
                }
            },
            include: [{
                model: Contract,
                include: [{
                    model: Profile,
                    as: 'Contractor',
                    attributes: ['profession']
                }]
            }]
        })
        const professions = {}
        jobs.forEach(job => {
            if (!professions[job.Contract.Contractor.profession]) {
                professions[job.Contract.Contractor.profession] = job.price
            } else {
                professions[job.Contract.Contractor.profession] += job.price
            }
        })

        const bestProfession = Object.keys(professions).reduce((a, b) => professions[a] > professions[b] ? a : b)
        res.json({ "profession": bestProfession, "total": professions[bestProfession] })
    })

    /**
     * @returns the clients the paid the most for jobs in the query time period. 
     * Limit query parameter should be applied, default limit is 2.
     *
     *[
     *    {
     *        "id": 1,
     *        "fullName": "Reece Moyer",
     *        "paid" : 100.3
     *    },
     *    {
     *        "id": 200,
     *        "fullName": "Debora Martin",
     *        "paid" : 99
     *    },
     *    {
     *        "id": 22,
     *        "fullName": "Debora Martin",
     *        "paid" : 21
     *    }
     *]
     */
    app.get('/admin/best-clients', async (req, res) => {
        const { Job, Contract, Profile } = req.app.get('models')
        const { start, end, limit } = req.query

        const jobs = await Job.findAll({
            where: {
                paid: true,
                paymentDate: {
                    [Op.between]: [start, end]
                }
            },
            include: [{
                model: Contract,
                include: [{
                    model: Profile,
                    as: 'Client',
                    attributes: ['id', 'firstName', 'lastName']
                }]
            }]
        })

        const clients = {}
        jobs.forEach(job => {
            if (!clients[job.Contract.Client.id]) {
                clients[job.Contract.Client.id] = job.price
            } else {
                clients[job.Contract.Client.id] += job.price
            }
        })
        const bestClients = Object.keys(clients).map(clientId => {
            return {
                id: clientId,
                fullName: `${jobs.find(job => job.Contract.Client.id == clientId).Contract.Client.firstName} ${jobs.find(job => job.Contract.Client.id == clientId).Contract.Client.lastName}`,
                paid: clients[clientId]
            }
        }).sort((a, b) => b.paid - a.paid).slice(0, limit || 2)
        res.json(bestClients)
    })

    //other routes..
}
