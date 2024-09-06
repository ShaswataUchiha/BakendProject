// Promise method
const asyncHandler = (requestHandeler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandeler(req, res, next))
        .catch((err) => next(err))
    }
}



//TryCatch MEthod
// const asyncHandler = (fn) => async(req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(err.code || 500).json({
//             sucess : false,
//             message : err.message
//         })
//     }
// }

export {asyncHandler}