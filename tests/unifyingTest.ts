import * as anchor from "@project-serum/anchor";

const Side = {
	Bid: { bid: {} },
	Ask: { ask: {} },
};

const OrderType = {
	Limit: { limit: {} },
	ImmediateOrCancel: { immediateOrCancel: {} },
	PostOnly: { postOnly: {} },
};

const SelfTradeBehavior = {
	DecrementTake: { decremenTtake: {} },
	CancelProvide: { cancelProvide: {} },
	AbortTransaction: { abortTransaction: {} },
};

const textEncoder = new TextEncoder();