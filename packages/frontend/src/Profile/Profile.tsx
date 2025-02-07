import './Profile.css';

import jwtDecode from 'jwt-decode';
import React, { useState, useEffect } from 'react';
import * as nearApi from 'near-api-js';
import { nearConfig } from '../nearconfig';

import { Auth } from '../types';

interface Props {
	auth: Auth;
	onLoggedOut: () => void;
}

interface State {
	loading: boolean;
	user?: {
		id: number;
		username: string;
		claimed: number;
	};
	username: string;
	claim_result: string;
	claim_result_key: string;
}

interface JwtDecoded {
	payload: {
		id: string;
		publicAddress: string;
	};
}

export const Profile = ({ auth, onLoggedOut }: Props): JSX.Element => {
	const [state, setState] = useState<State>({
		loading: true,
		user: undefined,
		username: '',
		claim_result: '',
		claim_result_key: '',
	});

	useEffect(() => {
		const { accessToken } = auth;
		const {
			payload: { id },
		} = jwtDecode<JwtDecoded>(accessToken);

		console.log('fetching...');
		const handleErrors = (response: any) => {
			if (!response.ok) throw new Error(response.status);
			return response;
		};

		fetch(`${process.env.REACT_APP_BACKEND_URL}/users/${id}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
			// handle network err/success
			.then(handleErrors)
			.then((response) => response.json())
			.then((user) => {
				if (user && !user.claimed) {
					console.log('claiming...');
					try {
						const keypair: nearApi.utils.KeyPair = nearApi.utils.KeyPair.fromRandom(
							'ed25519'
						);
						const key = {
							publicKey: keypair.getPublicKey().toString(),
							secretKey: keypair.toString(),
						};
						const claim_result_key = key.secretKey.replace(
							'ed25519:',
							''
						);

						fetch(
							`${process.env.REACT_APP_BACKEND_URL}/claim/${user.id}/${key.publicKey}`,
							{
								body: '',
								headers: {
									Authorization: `Bearer ${accessToken}`,
									'Content-Type': 'application/json',
								},
								method: 'PATCH',
							}
						)
							.then((response) => response.json())
							.then((response) => {
								if (response && response.status) {
									const new_user = response.user;
									new_user.claimed = 1;
									setState({
										...state,
										loading: false,
										user: new_user,
										claim_result: GetSuccessMessageClaimedNow(),
										claim_result_key: claim_result_key,
									});
								} else {
									if (response.status) alert(response.text);

									setState({
										...state,
										loading: false,
										user: response.user,
									});
								}
								window.localStorage.setItem(
									`claim_${user.id}`,
									claim_result_key
								);
							})
							.catch((err) => {
								console.log(err);
								window.alert(err);
								setState({ ...state, loading: false });
							});
					} catch (e) {
						console.log(e);
					}
				} else {
					setState({
						...state,
						loading: false,
						user,
						claim_result: GetSuccessMessageClaimedBefore(),
					});
				}
			})
			.catch(window.alert);
	}, []);

	const ClaimResult = () => {
		const { claim_result, claim_result_key } = state;

		return claim_result ? (
			<div className="claim-result">
				{claim_result}
				<GetClaimButton />
			</div>
		) : null;
	};

	const { accessToken } = auth;

	const {
		payload: { publicAddress },
	} = jwtDecode<JwtDecoded>(accessToken);

	const { loading, user, claim_result } = state;

	const userId = user && user.id;

	if (userId) {
		const keyOfPreviousClaim = window.localStorage.getItem(
			`claim_${userId}`
		);
		if (keyOfPreviousClaim && !claim_result) {
			setState({
				...state,
				claim_result: GetSuccessMessageClaimedBefore(),
			});
		}
	}

	return (
		<div className="App landing">
			<nav data-behavior="topbar" className="topbar profile-header">
				<div
					className="profile-nav"
					onClick={() =>
						(window.location.href = nearConfig.BridgeUrl)
					}
				>
					<div className="logo" />
					<div className="rainbow-bridge">NEAR Rainbow Bridge</div>
				</div>
				<div className="logout">
					<button onClick={onLoggedOut}>Logout</button>
				</div>
			</nav>

			<header className="App-header">
				<a
					href="https://paras.id/?ref=faucet"
					rel="noreferrer"
					target="_blank"
				>
					<svg
						width="120"
						height="30"
						viewBox="0 0 80 19"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M27.8185 18.223L27.4999 17.0833C27.4018 17.1649 27.2956 17.2426 27.1812 17.3161C26.1355 18.0269 24.6813 18.3823 22.8185 18.3823C21.0538 18.3823 19.6486 18.0636 18.6029 17.4264C17.5571 16.7891 17.0342 15.6168 17.0342 13.9092C17.0342 12.3079 17.5653 11.1723 18.6274 10.5024C19.6976 9.83247 21.3561 9.4975 23.6028 9.4975H27.218V9.05633C27.218 8.10045 26.9647 7.41826 26.4582 7.00977C25.9517 6.59311 25.2736 6.38477 24.4239 6.38477C23.6559 6.38477 23.0023 6.5686 22.4631 6.93624C21.9239 7.30389 21.589 7.88803 21.4582 8.68868L17.3406 7.53673C17.5857 6.20504 18.3128 5.20831 19.522 4.54655C20.7393 3.88479 22.3079 3.5539 24.2278 3.5539C27.0056 3.5539 28.9051 4.12988 29.9263 5.28184C30.9476 6.43379 31.4582 8.07186 31.4582 10.196V18.223H27.8185ZM27.218 13.897V11.9852H24.4852C23.276 11.9852 22.4468 12.1364 21.9974 12.4387C21.5563 12.741 21.3357 13.2107 21.3357 13.848C21.3357 14.4771 21.5358 14.9509 21.9362 15.2695C22.3365 15.58 22.9778 15.7352 23.8602 15.7352C24.8324 15.7352 25.633 15.5514 26.2621 15.1838C26.8994 14.8161 27.218 14.3872 27.218 13.897Z"
							fill="white"
						/>
						<path
							d="M43.0744 10.8823C43.0744 9.06041 42.8661 7.87169 42.4494 7.31614C42.0409 6.75242 41.4691 6.47056 40.7338 6.47056C39.8841 6.47056 39.206 6.76876 38.6995 7.36516C38.2746 7.87169 38.0295 8.43542 37.9642 9.05633V18.223H33.7485V3.68871H37.7803L37.8661 5.08576C37.907 5.04491 37.9478 5.00815 37.9887 4.97547C39.0916 4.03593 40.5377 3.56616 42.3269 3.56616C44.2632 3.56616 45.5744 4.16256 46.2607 5.35537C46.947 6.54 47.2901 8.38231 47.2901 10.8823H43.0744Z"
							fill="white"
						/>
						<path
							d="M59.9157 18.223L59.597 17.0833C59.499 17.1649 59.3928 17.2426 59.2784 17.3161C58.2327 18.0269 56.7784 18.3823 54.9157 18.3823C53.151 18.3823 51.7458 18.0636 50.7 17.4264C49.6543 16.7891 49.1314 15.6168 49.1314 13.9092C49.1314 12.3079 49.6624 11.1723 50.7245 10.5024C51.7948 9.83247 53.4533 9.4975 55.7 9.4975H59.3152V9.05633C59.3152 8.10045 59.0619 7.41826 58.5554 7.00977C58.0488 6.59311 57.3707 6.38477 56.5211 6.38477C55.7531 6.38477 55.0995 6.5686 54.5603 6.93624C54.0211 7.30389 53.6861 7.88803 53.5554 8.68868L49.4378 7.53673C49.6829 6.20504 50.41 5.20831 51.6191 4.54655C52.8364 3.88479 54.4051 3.5539 56.325 3.5539C59.1028 3.5539 61.0023 4.12988 62.0235 5.28184C63.0447 6.43379 63.5553 8.07186 63.5553 10.196V18.223H59.9157ZM59.3152 13.897V11.9852H56.5823C55.3732 11.9852 54.5439 12.1364 54.0946 12.4387C53.6534 12.741 53.4328 13.2107 53.4328 13.848C53.4328 14.4771 53.633 14.9509 54.0333 15.2695C54.4337 15.58 55.075 15.7352 55.9573 15.7352C56.9296 15.7352 57.7302 15.5514 58.3593 15.1838C58.9965 14.8161 59.3152 14.3872 59.3152 13.897Z"
							fill="white"
						/>
						<path
							d="M72.9902 18.3455C71.0131 18.3455 69.3914 18.0514 68.1251 17.4632C66.8587 16.8667 66.0376 15.8823 65.6618 14.5097L69.3628 13.1617C69.5262 14.0277 69.9347 14.6445 70.5883 15.0122C71.25 15.3717 72.0262 15.5514 72.9167 15.5514C73.8481 15.5514 74.567 15.4248 75.0736 15.1715C75.5801 14.9182 75.8334 14.5547 75.8334 14.0808C75.8334 13.4844 75.527 13.0963 74.9142 12.9166C74.3097 12.7287 73.317 12.5326 71.9363 12.3284C69.7059 12.0343 68.121 11.589 67.1814 10.9926C66.2419 10.3962 65.7721 9.3627 65.7721 7.89212C65.7721 6.38886 66.4176 5.29409 67.7084 4.60782C69.0074 3.92155 70.7231 3.57841 72.8554 3.57841C74.9224 3.57841 76.5074 3.87253 77.6103 4.46076C78.7214 5.04083 79.4445 5.98445 79.7794 7.29163L76.2133 8.61516C76.0417 7.83084 75.6618 7.25895 75.0736 6.89948C74.4935 6.53183 73.7296 6.34801 72.7819 6.34801C71.8832 6.34801 71.1806 6.4869 70.6741 6.76467C70.1757 7.04245 69.9265 7.40193 69.9265 7.8431C69.9265 8.41499 70.2492 8.77855 70.8947 8.93378C71.5482 9.08901 72.5327 9.26058 73.8481 9.44848C75.9886 9.72626 77.549 10.1715 78.5294 10.7843C79.5098 11.3888 80 12.4101 80 13.848C80 15.4738 79.3668 16.6298 78.1005 17.3161C76.8423 18.0024 75.1389 18.3455 72.9902 18.3455Z"
							fill="white"
						/>
						<path
							fillRule="evenodd"
							clipRule="evenodd"
							d="M2.45097 18.3823L0 0L10.3553 1.83823C10.7955 1.95407 11.2031 2.0472 11.5784 2.13296C12.9897 2.45543 13.9444 2.67359 14.4607 3.60292C15.1143 4.77122 15.4411 6.20912 15.4411 7.91663C15.4411 9.63231 15.1143 11.0743 14.4607 12.2426C13.8071 13.4109 12.4387 13.995 10.3553 13.995H5.87007L6.72791 18.3823H2.45097ZM3.799 3.799L9.3876 4.78089C9.62517 4.84277 9.84513 4.89252 10.0477 4.93832C10.8093 5.11057 11.3246 5.2271 11.6032 5.72351C11.9559 6.34755 12.1323 7.11561 12.1323 8.02767C12.1323 8.9441 11.9559 9.71434 11.6032 10.3384C11.2505 10.9624 10.5119 11.2745 9.3876 11.2745H6.8347L5.29625 11.1519L3.799 3.799Z"
							fill="white"
						/>
					</svg>
				</a>
				<h1 className="App-title">NEAR Faucet for Ethereum Holders</h1>
				<p style={{ fontWeight: 'normal' }}>
					Create and Collect NFTs on {' '}
					<a
						href="http://bit.ly/paras-ref-faucet"
						target="_blank"
						rel="noreferrer"
						style={{
							textDecoration: 'underline',
							cursor: 'pointer',
							color: 'white',
							fontWeight: 'bold',
						}}
					>
						Paras: Digital Card Collectibles
					</a>
				</p>
			</header>
			<div className="App-intro">
				<div className="Profile">
					<div>
						<div className="claim-container">
							{loading ? 'Claiming...' : ''}
						</div>
					</div>

					<ClaimResult />

					<div className="account-info">
						Your Ethereum Address: <code>{publicAddress}</code>
					</div>
				</div>
			</div>
		</div>
	);

	function GetClaimButton() {
		let { claim_result_key } = state;

		if (!claim_result_key)
			claim_result_key =
				window.localStorage.getItem(`claim_${userId}`) || '';

		return claim_result_key ? (
			<button
				className="action-button cta"
				type="button"
				onClick={(e) => {
					e.preventDefault();
					window.location.href = `${nearConfig.ClaimUrl
						}${claim_result_key.replace('ed25519:', '')}`;
				}}
			>
				Create Account
			</button>
		) : (
			<div className="key-not-found">
				Key not found in the localstorage. <br />
				Did you claim it in the different browser?
			</div>
		);
	}

	function GetSuccessMessageClaimedNow() {
		return `Next, create an account in the NEAR Wallet:`;
	}

	function GetSuccessMessageClaimedBefore() {
		return `Already claimed! Continue below:`;
	}
};
